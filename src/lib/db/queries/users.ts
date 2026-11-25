import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { allAsync, getAsync, getDb, nowISO, runAsync } from "../index";
import { createSession, deleteSessionsByUser, toSessionUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { appUrl, mailLayout, sendMail } from "@/lib/mail";
import { decrypt, encrypt, sha256 } from "@/lib/secrets";
import { generateRecoveryCodes, generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { consumeToken, createUserToken, findValidToken } from "./tokens";
import type { AdminUser, Profile } from "@/types";

export const BCRYPT_ROUNDS = 12;

type UserRow = {
    id: number;
    name: string;
    email: string;
    password: string;
    sw_admin: number;
    onboarding_completed_at: string | null;
    email_verified_at: string | null;
    two_factor_secret: string | null;
    two_factor_recovery_codes: string | null;
    two_factor_confirmed_at: string | null;
    notify_email: number;
    reminder_days: number;
    created_at: string | null;
};

const USER_COLUMNS = `id, name, email, password, sw_admin, onboarding_completed_at, email_verified_at,
                      two_factor_secret, two_factor_recovery_codes, two_factor_confirmed_at, notify_email, reminder_days, created_at`;

async function getUser(id: number) {
    const row = await getAsync<UserRow>(getDb(), `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
    if (!row) throw new HttpError(404, "Usuario no encontrado.");
    return row;
}

// Hash ficticio para igualar tiempos cuando el correo no existe (evita enumerar usuarios).
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("miscuentas-dummy-password", BCRYPT_ROUNDS));

/* ------------------------------ Registro y login ----------------------------- */

export async function createUser({ name, email, passwordHash }: { name: string; email: string; passwordHash: string }) {
    const existing = await getAsync<{ id: number }>(getDb(), `SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (existing) throw new HttpError(409, "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.");

    const result = await runAsync(getDb(), `INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`, [
        name,
        email,
        passwordHash,
        nowISO(),
        nowISO(),
    ]);
    return { id: result.lastID };
}

/**
 * Valida credenciales. Si el usuario tiene verificación en dos pasos, no crea la sesión:
 * devuelve un reto temporal (5 min) que se completa con el código de la app.
 */
export async function login({ email, password }: { email: string; password: string }) {
    const row = await getAsync<UserRow>(getDb(), `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`, [email]);
    const valid = await bcrypt.compare(password, row?.password ?? (await getDummyHash()));
    if (!row || !valid) throw new HttpError(401, "Correo o contraseña incorrectos.");

    if (row.two_factor_confirmed_at) {
        const challenge = await createUserToken(row.id, "login_2fa", 5);
        return { twoFactor: true as const, challenge };
    }

    const { token, expiresAt } = await createSession(row.id);
    return { twoFactor: false as const, user: toSessionUser(row), token, expiresAt };
}

/** Segundo paso del login: código TOTP o código de recuperación. */
export async function completeTwoFactorLogin(challenge: string, code: string) {
    const pending = await findValidToken(challenge, "login_2fa");
    if (!pending) throw new HttpError(401, "La verificación expiró. Inicia sesión de nuevo.");

    const user = await getUser(pending.user_id);
    const ok = await checkSecondFactor(user, code);
    if (!ok) throw new HttpError(401, "El código no es válido.");

    if (!(await consumeToken(challenge, "login_2fa"))) throw new HttpError(401, "La verificación expiró. Inicia sesión de nuevo.");
    const { token, expiresAt } = await createSession(user.id);
    return { user: toSessionUser(user), token, expiresAt };
}

async function checkSecondFactor(user: UserRow, code: string) {
    if (!user.two_factor_secret) return false;
    const clean = code.trim().toUpperCase();

    if (/^\d{6}$/.test(clean.replace(/\s/g, ""))) return verifyTotp(decrypt(user.two_factor_secret), clean);

    // Código de recuperación (un solo uso).
    const codes: string[] = JSON.parse(user.two_factor_recovery_codes ?? "[]");
    const hash = sha256(clean.replace(/[^A-Z0-9]/g, ""));
    if (!codes.includes(hash)) return false;
    await runAsync(getDb(), `UPDATE users SET two_factor_recovery_codes = ?, updated_at = ? WHERE id = ?`, [
        JSON.stringify(codes.filter((c) => c !== hash)),
        nowISO(),
        user.id,
    ]);
    return true;
}

/* ----------------------------- Verificación de correo ---------------------------- */

export async function sendVerificationEmail(userId: number) {
    const user = await getUser(userId);
    if (user.email_verified_at) return { alreadyVerified: true };
    const token = await createUserToken(user.id, "verify_email", 60 * 24, user.email);
    const { html, text } = mailLayout({
        title: `Confirma tu correo, ${user.name.split(" ")[0]}`,
        intro: "Confirma tu dirección para recibir recordatorios de pago y poder recuperar tu cuenta si olvidas la contraseña.",
        cta: { label: "Confirmar mi correo", url: appUrl(`/auth/verify?token=${token}`) },
        outro: "El enlace vence en 24 horas. Si no creaste una cuenta en MizCuentas, ignora este mensaje.",
    });
    await sendMail({ to: user.email, subject: "Confirma tu correo en MizCuentas", html, text });
    return { alreadyVerified: false };
}

export async function verifyEmail(token: string) {
    const row = await consumeToken(token, "verify_email");
    if (!row) throw new HttpError(400, "El enlace no es válido o ya venció. Solicita uno nuevo desde tu perfil.");
    // Solo verifica si el correo no cambió desde que se envió el enlace.
    const result = await runAsync(getDb(), `UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ? AND email = ?`, [
        nowISO(),
        nowISO(),
        row.user_id,
        row.payload,
    ]);
    if (result.changes === 0) throw new HttpError(400, "Este enlace corresponde a un correo anterior.");
    return { ok: true };
}

/* ------------------------------ Recuperar contraseña ----------------------------- */

/** Siempre responde igual exista o no el correo (no revela qué cuentas existen). */
export async function requestPasswordReset(email: string) {
    const user = await getAsync<{ id: number; name: string; email: string }>(getDb(), `SELECT id, name, email FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!user) {
        await getDummyHash();
        return;
    }
    const token = await createUserToken(user.id, "reset_password", 30);
    const { html, text } = mailLayout({
        title: "Restablece tu contraseña",
        intro: `Hola, ${user.name.split(" ")[0]}. Recibimos una solicitud para cambiar la contraseña de tu cuenta.`,
        cta: { label: "Crear nueva contraseña", url: appUrl(`/auth/reset?token=${token}`) },
        outro: "El enlace vence en 30 minutos y solo se puede usar una vez. Si no lo solicitaste, ignora este correo: tu contraseña no cambiará.",
    });
    await sendMail({ to: user.email, subject: "Restablece tu contraseña de MizCuentas", html, text });
}

export async function isResetTokenValid(token: string) {
    return Boolean(await findValidToken(token, "reset_password"));
}

export async function resetPassword(token: string, password: string) {
    const row = await consumeToken(token, "reset_password");
    if (!row) throw new HttpError(400, "El enlace no es válido o ya venció. Solicita uno nuevo.");
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // Quien recibe el correo demuestra que el correo es suyo: se marca como verificado.
    await runAsync(
        getDb(),
        `UPDATE users SET password = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?`,
        [hash, nowISO(), nowISO(), row.user_id]
    );
    await deleteSessionsByUser(row.user_id);
}

/* ------------------------------------ Perfil ------------------------------------ */

export async function getProfile(userId: number): Promise<Profile> {
    const user = await getUser(userId);
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: Boolean(user.email_verified_at),
        notify_email: Number(user.notify_email) === 1,
        reminder_days: Number(user.reminder_days),
        two_factor_enabled: Boolean(user.two_factor_confirmed_at),
        two_factor_pending: Boolean(user.two_factor_secret && !user.two_factor_confirmed_at),
        recovery_codes_left: user.two_factor_recovery_codes ? JSON.parse(user.two_factor_recovery_codes).length : 0,
        created_at: user.created_at,
    };
}

export async function updateProfile(userId: number, data: { name: string; notify_email: boolean; reminder_days: number }) {
    await runAsync(getDb(), `UPDATE users SET name = ?, notify_email = ?, reminder_days = ?, updated_at = ? WHERE id = ?`, [
        data.name,
        data.notify_email ? 1 : 0,
        data.reminder_days,
        nowISO(),
        userId,
    ]);
}

async function assertPassword(user: UserRow, password: string) {
    if (!(await bcrypt.compare(password, user.password))) throw new HttpError(400, "La contraseña actual no es correcta.");
}

export async function changePassword(userId: number, current: string, next: string, keepSessionToken: string) {
    const user = await getUser(userId);
    await assertPassword(user, current);
    const hash = await bcrypt.hash(next, BCRYPT_ROUNDS);
    await runAsync(getDb(), `UPDATE users SET password = ?, updated_at = ? WHERE id = ?`, [hash, nowISO(), userId]);
    // Cierra las demás sesiones abiertas.
    await deleteSessionsByUser(userId, keepSessionToken);
}

/** Cambiar el correo exige la contraseña y deja el nuevo correo pendiente de verificar. */
export async function changeEmail(userId: number, email: string, password: string) {
    const user = await getUser(userId);
    await assertPassword(user, password);
    if (email === user.email) return;
    const taken = await getAsync<{ id: number }>(getDb(), `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`, [email, userId]);
    if (taken) throw new HttpError(409, "Ese correo ya está registrado en otra cuenta.");

    await runAsync(getDb(), `UPDATE users SET email = ?, email_verified_at = NULL, updated_at = ? WHERE id = ?`, [email, nowISO(), userId]);
    const { html, text } = mailLayout({
        title: "Tu correo de MizCuentas cambió",
        intro: `El correo de tu cuenta se cambió a ${email}. Si no fuiste tú, restablece tu contraseña de inmediato.`,
    });
    await sendMail({ to: user.email, subject: "Se cambió el correo de tu cuenta", html, text });
    await sendVerificationEmail(userId);
}

export async function logoutOtherSessions(userId: number, keepSessionToken: string) {
    await deleteSessionsByUser(userId, keepSessionToken);
}

/* ------------------------------ Verificación en dos pasos ------------------------------ */

/** Paso 1: genera un secreto (cifrado en la BD) y el código QR para la app autenticadora. */
export async function startTwoFactorSetup(userId: number) {
    const user = await getUser(userId);
    if (user.two_factor_confirmed_at) throw new HttpError(400, "La verificación en dos pasos ya está activa.");
    const secret = generateTotpSecret();
    await runAsync(getDb(), `UPDATE users SET two_factor_secret = ?, two_factor_recovery_codes = NULL, updated_at = ? WHERE id = ?`, [
        encrypt(secret),
        nowISO(),
        userId,
    ]);
    const uri = otpauthUrl(secret, user.email);
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#0f172a", light: "#ffffff" } });
    return { secret, qr };
}

/** Paso 2: confirma con un código válido y entrega los códigos de recuperación (se muestran una sola vez). */
export async function confirmTwoFactor(userId: number, code: string) {
    const user = await getUser(userId);
    if (!user.two_factor_secret || user.two_factor_confirmed_at) throw new HttpError(400, "Primero inicia la configuración.");
    if (!verifyTotp(decrypt(user.two_factor_secret), code)) throw new HttpError(400, "El código no es válido. Revisa la hora de tu celular.");

    const codes = generateRecoveryCodes();
    await runAsync(getDb(), `UPDATE users SET two_factor_confirmed_at = ?, two_factor_recovery_codes = ?, updated_at = ? WHERE id = ?`, [
        nowISO(),
        JSON.stringify(codes.map((c) => sha256(c.replace(/[^A-Z0-9]/g, "")))),
        nowISO(),
        userId,
    ]);
    return { recoveryCodes: codes };
}

export async function disableTwoFactor(userId: number, password: string, code: string) {
    const user = await getUser(userId);
    await assertPassword(user, password);
    if (user.two_factor_confirmed_at && !(await checkSecondFactor(user, code))) throw new HttpError(400, "El código no es válido.");
    await runAsync(
        getDb(),
        `UPDATE users SET two_factor_secret = NULL, two_factor_recovery_codes = NULL, two_factor_confirmed_at = NULL, updated_at = ? WHERE id = ?`,
        [nowISO(), userId]
    );
}

/* -------------------------------- Administración -------------------------------- */

/** Lista para el administrador: nunca incluye contraseñas ni secretos 2FA. */
export async function listUsers() {
    return allAsync<AdminUser>(getDb(), `SELECT id, name, email, sw_admin, created_at, onboarding_completed_at FROM users ORDER BY name`);
}

export async function deleteUser(id: number) {
    const result = await runAsync(getDb(), `DELETE FROM users WHERE id = ?`, [id]);
    if (result.changes === 0) throw new HttpError(404, "No se encontró el usuario.");
    return { id };
}

export async function completeOnboarding(userId: number) {
    await runAsync(getDb(), `UPDATE users SET onboarding_completed_at = COALESCE(onboarding_completed_at, ?), updated_at = ? WHERE id = ?`, [
        nowISO(),
        nowISO(),
        userId,
    ]);
    return { ok: true };
}
