import crypto from "crypto";

const DEV_FALLBACK = "miscuentas-dev-secret-change-me-0123456789";

/**
 * Secreto de la aplicación (APP_SECRET): firma retos de 2FA y cifra los secretos TOTP.
 * En producción es obligatorio; en desarrollo se usa un valor fijo con advertencia.
 */
export function appSecret() {
    const secret = process.env.APP_SECRET;
    const placeholder = secret?.startsWith("cambia-esto");
    if (secret && secret.length >= 32 && !(placeholder && process.env.NODE_ENV === "production")) return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("APP_SECRET debe estar definido (mínimo 32 caracteres) en producción.");
    }
    return DEV_FALLBACK;
}

function key() {
    return crypto.createHash("sha256").update(appSecret()).digest();
}

export function sha256(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}

/** Cifrado autenticado AES-256-GCM → "iv.tag.data" en base64url. */
export function encrypt(plain: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string) {
    const [iv, tag, data] = payload.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
