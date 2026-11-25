/**
 * Diagnóstico de conexiones MySQL (útil con límites como el de Clever Cloud: 5 por usuario).
 *
 *   npm run db:check                      → muestra las conexiones abiertas de tu usuario
 *   npm run db:check -- --kill-idle       → cierra las conexiones inactivas (Sleep) de más de 60 s
 *   npm run db:check -- --kill-idle=300   → … de más de 300 s
 *
 * Solo ve y cierra conexiones del MISMO usuario de la base de datos (no requiere privilegios extra).
 */
import mysql from "mysql2/promise";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const killArg = process.argv.find((arg) => arg.startsWith("--kill-idle"));
const killAfter = killArg ? Number(killArg.split("=")[1] ?? 60) || 60 : null;

const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10_000,
};

let connection;
try {
    connection = await mysql.createConnection(config);
} catch (error) {
    if (error.code === "ER_USER_LIMIT_REACHED" || error.code === "ER_CON_COUNT_ERROR") {
        console.error(`\n❌ No hay cupo: ${error.sqlMessage}`);
        console.error(
            [
                "",
                "Todas las conexiones permitidas están ocupadas por otros clientes con el mismo usuario.",
                "Cómo liberarlas:",
                "  1. Detén los servidores locales (npm run dev / npm start) que usen esta base de datos.",
                "  2. Si la app está desplegada con una versión anterior (pool de 10 conexiones), reiníciala o despliega esta versión.",
                "  3. Cierra PhpMyAdmin / clientes SQL abiertos con este usuario.",
                "  4. Desde la consola de Clever Cloud puedes reiniciar el add-on de MySQL para cortar todas las conexiones.",
                "Luego vuelve a ejecutar: npm run db:check",
            ].join("\n")
        );
        process.exit(1);
    }
    console.error("❌ No fue posible conectar:", error.code ?? error.message);
    process.exit(1);
}

try {
    const [[me]] = await connection.query("SELECT CONNECTION_ID() AS id, CURRENT_USER() AS user, @@max_user_connections AS maxUser, @@max_connections AS maxServer, @@wait_timeout AS waitTimeout");
    const [rows] = await connection.query(
        `SELECT ID AS id, HOST AS host, DB AS db, COMMAND AS command, TIME AS seconds, STATE AS state
         FROM information_schema.PROCESSLIST
         WHERE USER = SUBSTRING_INDEX(CURRENT_USER(), '@', 1)
         ORDER BY TIME DESC`
    );

    console.log(`\nUsuario: ${String(me.user).split("@")[0]} · conexiones abiertas: ${rows.length}`);
    console.log(
        `Límite global por usuario: ${me.maxUser || "sin límite global (puede existir uno por usuario)"} · máximo del servidor: ${me.maxServer} · wait_timeout: ${me.waitTimeout}s\n`
    );
    console.table(
        rows.map((r) => ({
            id: r.id,
            origen: String(r.host).replace(/:\d+$/, ""),
            estado: r.command,
            "inactiva/activa (s)": r.seconds,
            nota: r.id === me.id ? "← esta revisión" : r.command === "Sleep" ? "inactiva" : r.state || "",
        }))
    );

    if (killAfter !== null) {
        const idle = rows.filter((r) => r.id !== me.id && r.command === "Sleep" && Number(r.seconds) >= killAfter);
        for (const r of idle) {
            try {
                await connection.query("KILL ?", [r.id]);
                console.log(`🔌 Conexión ${r.id} cerrada (inactiva ${r.seconds}s).`);
            } catch (error) {
                console.warn(`⚠️  No se pudo cerrar ${r.id}: ${error.code ?? error.message}`);
            }
        }
        if (idle.length === 0) console.log(`No hay conexiones inactivas de más de ${killAfter}s.`);
    } else if (rows.some((r) => r.command === "Sleep" && Number(r.seconds) > 60)) {
        console.log("Tip: hay conexiones inactivas. Para cerrarlas: npm run db:check -- --kill-idle");
    }
} finally {
    await connection.end();
}
