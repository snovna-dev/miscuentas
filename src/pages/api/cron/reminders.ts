import type { NextApiRequest, NextApiResponse } from "next";
import { sendDueReminders } from "@/lib/db/queries/notifications";
import { safeEqual } from "@/lib/secrets";

/**
 * Envía los recordatorios por correo. Protegido con CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 * Compatible con Vercel Cron, cron de Linux o el Programador de tareas de Windows (npm run reminders).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

    const secret = process.env.CRON_SECRET;
    const header = req.headers.authorization ?? "";
    if (!secret || secret.length < 16 || !safeEqual(header, `Bearer ${secret}`)) {
        return res.status(401).json({ error: "No autorizado." });
    }

    try {
        const result = await sendDueReminders();
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("[cron:reminders]", error);
        return res.status(500).json({ error: "No fue posible enviar los recordatorios." });
    }
}
