import { HttpError } from "@/lib/http";

type Bucket = { count: number; resetAt: number };

declare global {
    var __miscuentasRateLimit: Map<string, Bucket> | undefined;
}

const buckets: Map<string, Bucket> = globalThis.__miscuentasRateLimit ?? new Map();
globalThis.__miscuentasRateLimit = buckets;

/**
 * Limitador en memoria (ventana fija). Suficiente para una sola instancia;
 * si se despliega en varias instancias conviene moverlo a Redis.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();

    if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
        const minutes = Math.max(1, Math.ceil((bucket.resetAt - now) / 60_000));
        throw new HttpError(429, `Demasiados intentos. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`);
    }
}

export function resetRateLimit(key: string) {
    buckets.delete(key);
}
