import type { NextApiRequest, NextApiResponse } from "next";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import type { SessionUser } from "@/types";

/** Error controlado: su mensaje sí se muestra al usuario. */
export class HttpError extends Error {
    constructor(
        public status: number,
        message: string,
        public code?: string
    ) {
        super(message);
    }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type AuthedHandler = (req: NextApiRequest, res: NextApiResponse, user: SessionUser) => unknown | Promise<unknown>;
type PublicHandler = (req: NextApiRequest, res: NextApiResponse) => unknown | Promise<unknown>;

export async function getSessionUser(req: NextApiRequest) {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token || token.length > 256) return null;
    return getUserBySessionToken(token);
}

export function requireAdmin(user: SessionUser) {
    if (!user.isAdmin) throw new HttpError(403, "No tienes permisos para realizar esta acción.");
}

/**
 * Protección CSRF en profundidad (además de la cookie SameSite):
 * - Si el navegador envía `Origin`, debe coincidir con el host de la app.
 * - Las peticiones con cuerpo deben ser JSON (un formulario de otro sitio no puede enviarlo sin CORS).
 */
function assertSafeMutation(req: NextApiRequest) {
    const origin = req.headers.origin;
    if (origin) {
        const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() || req.headers.host;
        let originHost = "";
        try {
            originHost = new URL(origin).host;
        } catch {
            throw new HttpError(403, "Origen no permitido.");
        }
        if (!host || originHost !== host) throw new HttpError(403, "Origen no permitido.");
    }

    const hasBody = req.body && typeof req.body === "object" && Object.keys(req.body).length > 0;
    const contentType = req.headers["content-type"] ?? "";
    if (hasBody && !contentType.includes("application/json")) {
        throw new HttpError(415, "Formato de solicitud no soportado.");
    }
}

function handleError(error: unknown, req: NextApiRequest, res: NextApiResponse) {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
    }

    const mysqlCode = (error as { code?: string })?.code;
    // Sin cupo de conexiones en MySQL (p. ej. max_user_connections de Clever Cloud) tras reintentar.
    if (mysqlCode === "ER_USER_LIMIT_REACHED" || mysqlCode === "ER_CON_COUNT_ERROR" || mysqlCode === "ER_TOO_MANY_USER_CONNECTIONS") {
        console.error(`[api] ${req.method} ${req.url}: sin conexiones disponibles en MySQL (${mysqlCode}).`);
        res.setHeader("Retry-After", "5");
        return res.status(503).json({ error: "El servidor está ocupado en este momento. Intenta de nuevo en unos segundos.", code: "DB_BUSY" });
    }
    if (mysqlCode === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Ya existe un registro con esos datos." });
    }
    if (mysqlCode === "ER_ROW_IS_REFERENCED_2" || mysqlCode === "ER_ROW_IS_REFERENCED") {
        return res.status(409).json({ error: "No se puede eliminar porque tiene información asociada." });
    }

    // Nunca exponemos detalles internos (SQL, rutas, stack) al cliente.
    const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
    console.error(`[api:${ref}] ${req.method} ${req.url}`, error);
    return res.status(500).json({ error: `Ocurrió un error inesperado. Intenta de nuevo (ref. ${ref}).` });
}

function baseHeaders(res: NextApiResponse) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
}

function methodNotAllowed(res: NextApiResponse, allowed: string[]) {
    res.setHeader("Allow", allowed.join(", "));
    return res.status(405).json({ error: "Método no permitido." });
}

/** Ruta de API que exige sesión. El usuario siempre sale de la cookie, nunca del cuerpo. */
export function apiRoute(handlers: Partial<Record<Method, AuthedHandler>>, options: { admin?: boolean } = {}) {
    return async function handler(req: NextApiRequest, res: NextApiResponse) {
        baseHeaders(res);
        const method = (req.method ?? "GET").toUpperCase() as Method;
        const fn = handlers[method];
        if (!fn) return methodNotAllowed(res, Object.keys(handlers));

        try {
            if (method !== "GET") assertSafeMutation(req);

            const user = await getSessionUser(req);
            if (!user) throw new HttpError(401, "Tu sesión expiró. Inicia sesión nuevamente.", "UNAUTHENTICATED");
            if (options.admin) requireAdmin(user);

            const result = await fn(req, res, user);
            if (!res.headersSent) res.status(200).json(result ?? { success: true });
        } catch (error) {
            handleError(error, req, res);
        }
    };
}

/** Ruta pública (login, registro…). */
export function publicRoute(handlers: Partial<Record<Method, PublicHandler>>) {
    return async function handler(req: NextApiRequest, res: NextApiResponse) {
        baseHeaders(res);
        const method = (req.method ?? "GET").toUpperCase() as Method;
        const fn = handlers[method];
        if (!fn) return methodNotAllowed(res, Object.keys(handlers));

        try {
            if (method !== "GET") assertSafeMutation(req);
            const result = await fn(req, res);
            if (!res.headersSent) res.status(200).json(result ?? { success: true });
        } catch (error) {
            handleError(error, req, res);
        }
    };
}

export function clientIp(req: NextApiRequest) {
    if (process.env.TRUST_PROXY === "true") {
        const forwarded = req.headers["x-forwarded-for"];
        const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
        if (first) return first;
    }
    return req.socket?.remoteAddress ?? "unknown";
}

