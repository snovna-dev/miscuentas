import mysql from "mysql2/promise";
import { loadEnvConfig } from "@next/env";

// Next ya carga .env.local; esto permite usar la capa de datos también desde scripts.
loadEnvConfig(process.cwd());

/** Cualquier objeto capaz de ejecutar consultas: el pool o una conexión dentro de una transacción. */
export type Queryable = mysql.Pool | mysql.PoolConnection;

declare global {
    // Un solo pool por proceso (también entre recargas en caliente y entre rutas de la app).
    var __miscuentasPool: mysql.Pool | undefined;
}

/**
 * Proveedores como Clever Cloud limitan las conexiones por usuario (plan gratuito: 5),
 * y ese límite lo comparten TODOS los clientes: la app en producción, tu `npm run dev`,
 * PhpMyAdmin, scripts… Por eso:
 *  - el pool es pequeño (DB_POOL_SIZE, por defecto 3);
 *  - las conexiones inactivas se cierran solas a los pocos segundos (DB_IDLE_TIMEOUT_MS)
 *    y como máximo se deja 1 abierta, para no acaparar cupos que otro cliente necesita.
 */
const POOL_SIZE = Math.min(Math.max(Number(process.env.DB_POOL_SIZE) || 3, 1), 20);
const IDLE_TIMEOUT_MS = Math.max(Number(process.env.DB_IDLE_TIMEOUT_MS) || 15_000, 1_000);

function createPool() {
    return mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: "utf8mb4",
        waitForConnections: true, // si el pool está lleno, las consultas esperan su turno (no abren más)
        connectionLimit: POOL_SIZE,
        maxIdle: Math.min(1, POOL_SIZE - 1),
        idleTimeout: IDLE_TIMEOUT_MS,
        gracefulEnd: true, // cierra con COM_QUIT: MySQL libera el cupo de inmediato
        queueLimit: 0,
        connectTimeout: 10_000,
        enableKeepAlive: true,
        decimalNumbers: true,
        dateStrings: true,
    });
}

const pool: mysql.Pool = globalThis.__miscuentasPool ?? createPool();
globalThis.__miscuentasPool = pool;

export function getDb() {
    return pool;
}

/* ------------------------------ Reintentos ------------------------------ */

/** Errores al ABRIR una conexión por falta de cupo: la consulta nunca se ejecutó, así que es seguro reintentar. */
const CONNECTION_LIMIT_CODES = new Set(["ER_USER_LIMIT_REACHED", "ER_CON_COUNT_ERROR", "ER_TOO_MANY_USER_CONNECTIONS"]);
const RETRY_DELAYS_MS = [250, 600, 1_200, 2_000];

export function isConnectionLimitError(error: unknown) {
    return CONNECTION_LIMIT_CODES.has((error as { code?: string })?.code ?? "");
}

let lastWarning = 0;

async function withConnectionRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (!isConnectionLimitError(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
            if (Date.now() - lastWarning > 30_000) {
                lastWarning = Date.now();
                console.warn(
                    `[db] MySQL rechazó una conexión por límite de conexiones (${(error as { code?: string }).code}). ` +
                        `Reintentando… Pool actual: ${POOL_SIZE}. Revisa DB_POOL_SIZE y otros clientes conectados (npm run db:check).`
                );
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        }
    }
}

/** Ejecuta en el pool con reintento; dentro de una transacción (conexión ya abierta) no hace falta. */
function query(db: Queryable, sql: string, params: unknown[]) {
    if (db === pool) return withConnectionRetry(() => pool.query(sql, params));
    return db.query(sql, params);
}

/**
 * Ejecuta `fn` dentro de una transacción real sobre UNA sola conexión del pool.
 *
 * Antes se enviaba `BEGIN`/`COMMIT` directamente al pool: cada sentencia podía ir por
 * una conexión distinta, por lo que las transacciones no protegían nada y algunas
 * conexiones quedaban con transacciones abiertas.
 */
export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const conn = await withConnectionRetry(() => pool.getConnection());

    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (error) {
        try {
            await conn.rollback();
        } catch {
            // la conexión pudo cerrarse; el error original es el relevante
        }
        throw error;
    } finally {
        conn.release();
    }
}

export async function runAsync(db: Queryable, sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
    const [result] = await query(db, sql, params);
    const resultSet = result as mysql.ResultSetHeader;

    return {
        lastID: resultSet.insertId ?? 0,
        changes: resultSet.affectedRows ?? 0,
    };
}

export async function getAsync<T>(db: Queryable, sql: string, params: unknown[] = []): Promise<T | undefined> {
    const [rows] = await query(db, sql, params);
    return (rows as T[])[0];
}

export async function allAsync<T>(db: Queryable, sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await query(db, sql, params);
    return rows as T[];
}

export function nowISO() {
    return new Date().toISOString();
}

/** Estado del pool (para diagnóstico). */
export function poolStats() {
    const internal = (pool as unknown as { pool?: { _allConnections?: { length: number }; _freeConnections?: { length: number }; _connectionQueue?: { length: number } } }).pool;
    return {
        limit: POOL_SIZE,
        idleTimeoutMs: IDLE_TIMEOUT_MS,
        open: internal?._allConnections?.length ?? null,
        idle: internal?._freeConnections?.length ?? null,
        waiting: internal?._connectionQueue?.length ?? null,
    };
}
