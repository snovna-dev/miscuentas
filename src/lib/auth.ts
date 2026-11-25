import crypto from "crypto";
import { serialize } from "cookie";
import type { NextApiResponse } from "next";
import { getAsync, getDb, runAsync } from "@/lib/db";
import type { SessionUser } from "@/types";

export const SESSION_COOKIE_NAME = "mc_session";
const SESSION_DAYS = 30;

type SessionUserRow = {
    id: number;
    name: string;
    email: string;
    sw_admin: number;
    onboarding_completed_at: string | null;
    email_verified_at?: string | null;
};

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

export function createSessionToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function sessionExpiresAtISO() {
    const d = new Date();
    d.setDate(d.getDate() + SESSION_DAYS);
    return d.toISOString();
}

/** Solo se guarda el hash del token: si la BD se filtra, las sesiones no se pueden reutilizar. */
export async function createSession(userId: number) {
    const db = getDb();
    const token = createSessionToken();
    const expiresAt = sessionExpiresAtISO();

    await runAsync(db, `INSERT INTO sessions (user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)`, [
        userId,
        sha256(token),
        new Date().toISOString(),
        expiresAt,
    ]);

    // Limpieza oportunista de sesiones vencidas del usuario.
    await runAsync(db, `DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?`, [userId, new Date().toISOString()]);

    return { token, expiresAt };
}

export async function deleteSessionByToken(token: string) {
    await runAsync(getDb(), `DELETE FROM sessions WHERE token_hash = ?`, [sha256(token)]);
}

export async function deleteSessionsByUser(userId: number, exceptToken?: string) {
    if (exceptToken) {
        await runAsync(getDb(), `DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?`, [userId, sha256(exceptToken)]);
        return;
    }
    await runAsync(getDb(), `DELETE FROM sessions WHERE user_id = ?`, [userId]);
}

export function toSessionUser(row: SessionUserRow): SessionUser {
    const isAdmin = Number(row.sw_admin) === 1;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        isAdmin,
        needsOnboarding: !isAdmin && row.onboarding_completed_at === null,
        emailVerified: Boolean(row.email_verified_at),
    };
}

export async function getUserBySessionToken(token: string): Promise<SessionUser | null> {
    const row = await getAsync<SessionUserRow>(
        getDb(),
        `SELECT u.id, u.name, u.email, u.sw_admin, u.onboarding_completed_at, u.email_verified_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?
         LIMIT 1`,
        [sha256(token), new Date().toISOString()]
    );

    return row ? toSessionUser(row) : null;
}

const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

export function setSessionCookie(res: NextApiResponse, token: string, expiresAt: string) {
    res.setHeader("Set-Cookie", serialize(SESSION_COOKIE_NAME, token, { ...cookieBase, expires: new Date(expiresAt) }));
}

export function clearSessionCookie(res: NextApiResponse) {
    res.setHeader("Set-Cookie", serialize(SESSION_COOKIE_NAME, "", { ...cookieBase, expires: new Date(0) }));
}

/** Página a la que debe ir el usuario después de iniciar sesión. */
export function homePathFor(user: SessionUser) {
    if (user.isAdmin) return "/admin/dashboard";
    if (user.needsOnboarding) return "/user/onboarding";
    return "/user/dashboard";
}
