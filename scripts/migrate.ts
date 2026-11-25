import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import nextEnv from "@next/env";

const migrationsDir = path.join(process.cwd(), "db", "migrations");
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
    waitForConnections: true,
    // Las migraciones usan una sola conexión (importante con límites como el de Clever Cloud).
    connectionLimit: 1,
    queueLimit: 0,

    // Permite ejecutar varios comandos SQL dentro del archivo
    multipleStatements: true,
});

async function applyMigrations() {
    const connection = await pool.getConnection();

    try {
        // Crear tabla de control de migraciones
        await connection.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const files = fs
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith(".sql"))
            .sort();

        for (const file of files) {

            // Verificar si ya fue ejecutada
            const [rows] = await connection.query(
                `SELECT id FROM migrations WHERE name = ?`,
                [file]
            );

            const migrations = rows as { id: number }[];

            if (migrations.length > 0) {
                console.log(`⏭️ Migración ya ejecutada: ${file}`);
                continue;
            }

            console.log(`🚀 Ejecutando migración: ${file}`);

            const sql = fs.readFileSync(
                path.join(migrationsDir, file),
                "utf8"
            );

            try {

                await connection.query(sql);

                await connection.query(
                    `INSERT INTO migrations (name) VALUES (?)`,
                    [file]
                );

                console.log(`✅ Migración completada: ${file}`);

            } catch (error) {

                console.error(`❌ Error en migración: ${file}`);
                throw error;

            }
        }

        console.log("🎉 Migraciones realizadas correctamente");

    } finally {
        connection.release();
        await pool.end();
    }
}

applyMigrations()
    .catch((error) => {
        console.error("❌ Error ejecutando migraciones:", error);
        process.exit(1);
    });