/**
 * Cliente HTTP único para el navegador: JSON, mensajes de error en español y manejo
 * de sesión expirada. Reemplaza los bloques fetch/try/catch repetidos en cada pantalla.
 */
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public code?: string
    ) {
        super(message);
    }
}

type Options = {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
};

export async function api<T = unknown>(url: string, { method = "GET", body, signal }: Options = {}): Promise<T> {
    let response: Response;

    try {
        response = await fetch(url, {
            method,
            signal,
            credentials: "same-origin",
            headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch (error) {
        if ((error as Error)?.name === "AbortError") throw error;
        throw new ApiError(0, "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 && typeof window !== "undefined" && !url.includes("/api/login")) {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.assign(`/auth/logIn?next=${next}&expired=1`);
        }
        throw new ApiError(response.status, data?.error ?? "Ocurrió un error inesperado.", data?.code);
    }

    return data as T;
}

export function errorMessage(error: unknown, fallback = "Ocurrió un error inesperado.") {
    if (error instanceof ApiError || error instanceof Error) return error.message || fallback;
    return fallback;
}
