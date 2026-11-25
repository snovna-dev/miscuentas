import { HttpError } from "@/lib/http";
import { parseISODate } from "@/lib/dates";

const bad = (message: string) => new HttpError(400, message);

export function asObject(value: unknown, label = "la solicitud"): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw bad(`Faltan los datos de ${label}.`);
    }
    return value as Record<string, unknown>;
}

export function reqId(value: unknown, field = "id") {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 2_147_483_647) {
        throw bad(`El campo "${field}" no es válido.`);
    }
    return n;
}

export function optId(value: unknown, field = "id") {
    if (value === undefined || value === null || value === "") return null;
    return reqId(value, field);
}

export function reqInt(value: unknown, field: string, min: number, max: number) {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
        throw bad(`El campo "${field}" debe estar entre ${min} y ${max}.`);
    }
    return n;
}

export function reqString(value: unknown, field: string, { min = 1, max = 255 } = {}) {
    if (typeof value !== "string") throw bad(`El campo "${field}" es obligatorio.`);
    const text = value.trim().replace(/\s+/g, " ");
    if (text.length < min) throw bad(`El campo "${field}" es obligatorio.`);
    if (text.length > max) throw bad(`El campo "${field}" admite máximo ${max} caracteres.`);
    return text;
}

export function optString(value: unknown, field: string, { max = 500 } = {}) {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") throw bad(`El campo "${field}" no es válido.`);
    const text = value.trim();
    if (text.length > max) throw bad(`El campo "${field}" admite máximo ${max} caracteres.`);
    return text;
}

/** Montos en pesos: positivos, máximo 2 decimales y un tope razonable. */
export function reqAmount(value: unknown, field = "valor") {
    const n = typeof value === "string" ? Number(value.replace(/[^\d.]/g, "")) : value;
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
        throw bad(`El ${field} debe ser mayor a cero.`);
    }
    if (n > 999_999_999_999) throw bad(`El ${field} es demasiado alto.`);
    return Math.round(n * 100) / 100;
}

export function reqDate(value: unknown, field = "fecha") {
    const parts = parseISODate(value);
    if (!parts || parts.year < 2000 || parts.year > 2100) {
        throw bad(`La ${field} no es válida.`);
    }
    return { iso: value as string, ...parts };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function reqEmail(value: unknown) {
    if (typeof value !== "string") throw bad("El correo es obligatorio.");
    const email = value.trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 190) throw bad("Ingresa un correo electrónico válido.");
    return email;
}

/** Política mínima: 8+ caracteres, letras y números, máx. 72 bytes (límite de bcrypt). */
export function reqNewPassword(value: unknown) {
    if (typeof value !== "string" || value.length < 8) {
        throw bad("La contraseña debe tener al menos 8 caracteres.");
    }
    if (new TextEncoder().encode(value).length > 72) throw bad("La contraseña es demasiado larga.");
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value) || !/\d/.test(value)) {
        throw bad("La contraseña debe combinar letras y números.");
    }
    return value;
}

export function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], field: string): T {
    const candidate = (typeof allowed[0] === "number" ? Number(value) : value) as T;
    if (!allowed.includes(candidate)) throw bad(`El campo "${field}" no es válido.`);
    return candidate;
}

/** Cuenta opcional: ausente → undefined (cuenta principal), null/"" → null (ninguna), número → id. */
export function optAccount(value: unknown): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "" || value === "none") return null;
    return reqId(value, "cuenta");
}

/** Monto con signo (ajustes de saldo, retiros). Distinto de cero. */
export function reqSignedAmount(value: unknown, field = "valor") {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isFinite(n) || n === 0) throw bad(`El ${field} debe ser distinto de cero.`);
    if (Math.abs(n) > 999_999_999_999) throw bad(`El ${field} es demasiado alto.`);
    return Math.round(n * 100) / 100;
}

/** Monto que admite cero o negativo (saldo inicial de una cuenta). */
export function reqBalance(value: unknown, field = "saldo") {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 999_999_999_999) throw bad(`El ${field} no es válido.`);
    return Math.round(n * 100) / 100;
}

export function optDate(value: unknown, field = "fecha") {
    if (value === undefined || value === null || value === "") return null;
    return reqDate(value, field).iso;
}
