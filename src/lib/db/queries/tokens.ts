import { getAsync, getDb, nowISO, runAsync } from "../index";
import { randomToken, sha256 } from "@/lib/secrets";

export type TokenPurpose = "reset_password" | "verify_email" | "login_2fa";

/**
 * Tokens de un solo uso. Solo se guarda el hash SHA-256: si la base se filtra,
 * los enlaces de los correos no se pueden reutilizar.
 */
export async function createUserToken(userId: number, purpose: TokenPurpose, minutes: number, payload: string | null = null) {
    // Un único token vigente por propósito.
    await runAsync(getDb(), `DELETE FROM user_tokens WHERE user_id = ? AND purpose = ? AND used_at IS NULL`, [userId, purpose]);
    const token = randomToken(32);
    const expires = new Date(Date.now() + minutes * 60_000).toISOString();
    await runAsync(getDb(), `INSERT INTO user_tokens (user_id, purpose, token_hash, payload, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [
        userId,
        purpose,
        sha256(token),
        payload,
        expires,
        nowISO(),
    ]);
    return token;
}

type TokenRow = { id: number; user_id: number; payload: string | null };

/** Devuelve el token si es válido (sin consumirlo). */
export async function findValidToken(token: string, purpose: TokenPurpose) {
    if (!token || token.length > 128) return null;
    return (
        (await getAsync<TokenRow>(
            getDb(),
            `SELECT id, user_id, payload FROM user_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ? LIMIT 1`,
            [sha256(token), purpose, nowISO()]
        )) ?? null
    );
}

/** Marca el token como usado de forma atómica (evita usos dobles concurrentes). */
export async function consumeToken(token: string, purpose: TokenPurpose) {
    const row = await findValidToken(token, purpose);
    if (!row) return null;
    const result = await runAsync(getDb(), `UPDATE user_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL`, [nowISO(), row.id]);
    return result.changes === 1 ? row : null;
}
