/**
 * Dispara el envío diario de recordatorios de pago por correo.
 *
 *   npm run reminders
 *
 * Prográmalo una vez al día (cron en Linux, Programador de tareas en Windows).
 * Llama a /api/cron/reminders de la app en ejecución usando CRON_SECRET.
 */
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;

if (!secret) {
    console.error("❌ Define CRON_SECRET en .env.local (mínimo 16 caracteres).");
    process.exit(1);
}

try {
    const response = await fetch(`${base}/api/cron/reminders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error(`❌ Error ${response.status}:`, data.error ?? data);
        process.exit(1);
    }
    console.log(`✅ Recordatorios enviados: ${data.emails} correo(s), ${data.items} pago(s) recordados, ${data.users} usuario(s) revisados.`);
} catch (error) {
    console.error(`❌ No se pudo conectar con ${base}. ¿La app está en ejecución?`, error.message);
    process.exit(1);
}
