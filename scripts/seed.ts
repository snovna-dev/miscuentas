import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";

/**
 * Seed IDEMPOTENTE: se puede ejecutar en cada despliegue sin perder datos.
 *
 * La versión anterior hacía `DELETE FROM expense_states` y `DELETE FROM expense_categories`.
 * Como las llaves foráneas tienen ON DELETE CASCADE, cada ejecución del seed borraba
 * TODOS los gastos y pagos de TODOS los usuarios, y los estados cambiaban de id (3, 4…).
 */

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const STATES: [number, string, string][] = [
    [1, "Pendiente", "El gasto está pendiente de pago"],
    [2, "Pago", "El gasto está pago"],
];

// [nombre, tipo (1 = fijo, 2 = variable), descripción]
const CATEGORIES: [string, number, string][] = [
    ["Vivienda", 1, "Arriendo, cuota del conjunto, seguro del hogar"],
    ["Servicios publicos", 1, "Energía, agua, internet"],
    ["Transporte", 2, "Seguro del vehículo, parqueadero, transporte diario"],
    ["Educación", 1, "Matrícula, pensión, suscripciones educativas"],
    ["Seguros", 1, "De vida, hogar, vehículo"],
    ["Deudas", 1, "Créditos, préstamos"],
    ["Suscripciones", 1, "Membresías, plataformas, software"],
    ["Salud", 2, "Medicamentos, medicina prepagada, seguro médico"],
    ["Alimentación", 2, "Snacks, bebidas, domicilios"],
    ["Mercado", 1, "Dinero destinado mensualmente para la alimentación"],
    ["Compras personales", 2, "Ropa, calzado, accesorios, cuidado personal"],
    ["Entretenimiento", 2, "Cine, videojuegos, eventos, salidas"],
    ["Hogar", 2, "Reparaciones, mantenimiento, muebles"],
    ["Familia", 2, "Regalos, actividades familiares, gastos imprevistos"],
    ["Mascotas", 2, "Veterinarios, medicamentos, accesorios"],
    ["Viajes", 2, "Transporte, hospedaje, alimentación"],
    ["Otros variables", 2, "Imprevistos, comisiones, multas, gastos varios"],
    ["Vehículos", 1, "Repuestos, SOAT, gasolina, seguros"],
];

function isStrongPassword(value: string) {
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: "utf8mb4",
    });

    const now = new Date().toISOString();

    try {
        console.log(`Conectado a MySQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

        // Estados con id fijo: el código usa 1 = Pendiente y 2 = Pago.
        for (const [id, name, description] of STATES) {
            await connection.execute(
                `INSERT INTO expense_states (id, name, description) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
                [id, name, description]
            );
        }
        console.log(`✅ ${STATES.length} estados de gasto verificados.`);

        // Categorías: solo se insertan las que no existen (por nombre).
        let created = 0;
        for (const [name, type, description] of CATEGORIES) {
            const [result] = await connection.execute<mysql.ResultSetHeader>(
                `INSERT INTO expense_categories (name, category_type, description, created_at, updated_at)
                 SELECT ?, ?, ?, ?, ? FROM DUAL
                 WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = ?)`,
                [name, type, description, now, now, name]
            );
            created += result.affectedRows;
        }
        console.log(`✅ Categorías verificadas (${created} nuevas, ${CATEGORIES.length - created} existentes).`);

        // Administrador: se crea solo si no existe y nunca con una contraseña débil.
        const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || "";

        if (!adminEmail) {
            console.log("ℹ️  ADMIN_EMAIL no está definido: se omite la creación del administrador.");
        } else {
            const [rows] = await connection.execute<mysql.RowDataPacket[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [adminEmail]);

            if (rows.length > 0) {
                await connection.execute(`UPDATE users SET sw_admin = 1, updated_at = ? WHERE email = ?`, [now, adminEmail]);
                console.log(`✅ Administrador existente verificado (${adminEmail}).`);
            } else if (!isStrongPassword(adminPassword)) {
                console.warn("⚠️  ADMIN_PASSWORD debe tener 8+ caracteres con letras y números. No se creó el administrador.");
            } else {
                const hash = await bcrypt.hash(adminPassword, 12);
                await connection.execute(
                    `INSERT INTO users (name, email, password, created_at, updated_at, sw_admin, onboarding_completed_at)
                     VALUES (?, ?, ?, ?, ?, 1, ?)`,
                    ["Administrador", adminEmail, hash, now, now, now]
                );
                console.log(`✅ Administrador creado (${adminEmail}).`);
            }
        }

        console.log("Seed completado con éxito ✅");
    } catch (err) {
        console.error("❌ Error ejecutando seed:", err);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
}

main();
