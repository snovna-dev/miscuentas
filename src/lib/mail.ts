import nodemailer from "nodemailer";

/**
 * Envío de correos. Configura SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/MAIL_FROM.
 * Sin SMTP configurado (desarrollo) el correo se imprime en la consola del servidor.
 */

type Mail = { to: string; subject: string; html: string; text: string };

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST) return null;
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
    return transporter;
}

export function mailEnabled() {
    return Boolean(process.env.SMTP_HOST);
}

export async function sendMail(mail: Mail) {
    const transport = getTransporter();
    const from = process.env.MAIL_FROM || "MizCuentas <no-reply@miscuentas.local>";

    if (!transport) {
        if (process.env.NODE_ENV === "production") {
            console.warn(`[mail] SMTP no configurado: no se envió "${mail.subject}".`);
            return { delivered: false };
        }
        console.info(`\n[mail:dev] Para: ${mail.to}\n[mail:dev] Asunto: ${mail.subject}\n${mail.text}\n`);
        return { delivered: false, preview: mail.text };
    }

    await transport.sendMail({ from, ...mail });
    return { delivered: true };
}

/** URL pública de la app. Nunca se toma del encabezado Host (evita enlaces de recuperación envenenados). */
export function appUrl(path = "/") {
    const base = process.env.APP_URL?.replace(/\/$/, "");
    if (!base) {
        if (process.env.NODE_ENV === "production") throw new Error("APP_URL debe estar definido en producción.");
        return `http://localhost:${process.env.PORT || 3000}${path}`;
    }
    return `${base}${path}`;
}

const escape = (value: string) =>
    value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plantilla HTML de marca para todos los correos. */
export function mailLayout({ title, intro, cta, outro, rows }: { title: string; intro: string; cta?: { label: string; url: string }; outro?: string; rows?: string[][] }) {
    const table = rows?.length
        ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0">${rows
              .map(
                  (cells) =>
                      `<tr>${cells.map((cell, i) => `<td style="padding:10px 0;border-bottom:1px solid #e6ece9;${i === cells.length - 1 ? "text-align:right;font-weight:600" : "color:#334155"}">${escape(cell)}</td>`).join("")}</tr>`
              )
              .join("")}</table>`
        : "";

    const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f3f7f5;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
<tr><td style="background:linear-gradient(135deg,#34d399,#0d9488 55%,#155e75);padding:28px 32px;color:#fff">
<div style="font-size:20px;font-weight:700">Miz<span style="opacity:.85">Cuentas</span></div></td></tr>
<tr><td style="padding:28px 32px">
<h1 style="margin:0 0 12px;font-size:20px">${escape(title)}</h1>
<p style="margin:0;color:#475569;line-height:1.6">${escape(intro)}</p>
${table}
${cta ? `<p style="margin:24px 0"><a href="${escape(cta.url)}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600">${escape(cta.label)}</a></p>` : ""}
${outro ? `<p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">${escape(outro)}</p>` : ""}
</td></tr></table>
<p style="color:#94a3b8;font-size:12px;margin-top:16px">MizCuentas · Este correo se envió automáticamente.</p>
</td></tr></table></body></html>`;

    const text = [title, "", intro, ...(rows ?? []).map((r) => `- ${r.join(": ")}`), cta ? `\n${cta.label}: ${cta.url}` : "", outro ? `\n${outro}` : ""].join("\n");
    return { html, text };
}
