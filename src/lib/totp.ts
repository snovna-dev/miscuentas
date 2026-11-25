import crypto from "crypto";

/** TOTP (RFC 6238) compatible con Google Authenticator, Microsoft Authenticator, Authy, 1Password… */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer) {
    let bits = 0;
    let value = 0;
    let output = "";
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
    return output;
}

export function base32Decode(input: string) {
    const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of clean) {
        const index = ALPHABET.indexOf(char);
        if (index === -1) throw new Error("Secreto base32 inválido");
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

export function generateTotpSecret() {
    return base32Encode(crypto.randomBytes(20));
}

export function totp(secret: string, timeMs = Date.now(), step = 30, digits = 6) {
    const counter = Math.floor(timeMs / 1000 / step);
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
    return String(code).padStart(digits, "0");
}

/** Acepta el código actual y ±1 intervalo (tolerancia de reloj de 30 s). */
export function verifyTotp(secret: string, code: string, window = 1) {
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) return false;
    const now = Date.now();
    for (let i = -window; i <= window; i++) {
        const expected = totp(secret, now + i * 30_000);
        if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return true;
    }
    return false;
}

export function otpauthUrl(secret: string, account: string, issuer = "MizCuentas") {
    const label = encodeURIComponent(`${issuer}:${account}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** 8 códigos de recuperación de un solo uso, formato XXXX-XXXX. */
export function generateRecoveryCodes(count = 8) {
    return Array.from({ length: count }, () => {
        const raw = base32Encode(crypto.randomBytes(5)).slice(0, 8);
        return `${raw.slice(0, 4)}-${raw.slice(4)}`;
    });
}
