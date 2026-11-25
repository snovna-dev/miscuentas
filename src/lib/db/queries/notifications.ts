import { allAsync, getAsync, getDb, nowISO, runAsync } from "../index";
import { daysFromToday, formatDateLong, parseISODate, toISODate, type YearMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { appUrl, mailLayout, sendMail } from "@/lib/mail";
import { serverCurrentMonth, serverToday } from "@/lib/serverTime";
import { listBudgetStatus, alertLevel } from "./budgets";
import { listOverdueExpenses, listPendingBetween } from "./period_expenses";
import type { AppNotification } from "@/types";

function addDays(iso: string, days: number) {
    const parts = parseISODate(iso)!;
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function dueText(date: string, today: string) {
    const days = daysFromToday(date, today);
    if (days < 0) return `venció hace ${-days} día${days === -1 ? "" : "s"}`;
    if (days === 0) return "vence hoy";
    if (days === 1) return "vence mañana";
    return `vence en ${days} días`;
}

/** Centro de notificaciones de la app (campana): se calcula en vivo, no se almacena. */
export async function getNotifications(userId: number): Promise<AppNotification[]> {
    const today = serverToday();
    const ym: YearMonth = serverCurrentMonth();
    const user = await getAsync<{ reminder_days: number; email_verified_at: string | null }>(
        getDb(),
        `SELECT reminder_days, email_verified_at FROM users WHERE id = ?`,
        [userId]
    );
    const horizon = addDays(today, Math.max(1, Number(user?.reminder_days ?? 2)));

    const [overduePrev, dueSoon, budgets] = await Promise.all([
        listOverdueExpenses(userId, ym),
        listPendingBetween(userId, toISODate(ym.year, ym.month, 1), horizon),
        listBudgetStatus(userId, ym, true),
    ]);

    const items: AppNotification[] = [];

    for (const e of [...overduePrev, ...dueSoon.filter((e) => e.expense_date < today)]) {
        items.push({
            id: `overdue-${e.id}`,
            kind: "overdue",
            severity: "danger",
            title: `${e.name} ${dueText(e.expense_date, today)}`,
            detail: `${formatMoney(e.amount)} · ${e.category_name}`,
            href: "/user/dashboard",
        });
    }
    for (const e of dueSoon.filter((e) => e.expense_date >= today)) {
        items.push({
            id: `due-${e.id}`,
            kind: "due",
            severity: "warning",
            title: `${e.name} ${dueText(e.expense_date, today)}`,
            detail: `${formatMoney(e.amount)} · ${formatDateLong(e.expense_date)}`,
            href: "/user/dashboard",
        });
    }
    for (const b of budgets) {
        const level = alertLevel(b.budget, b.spent);
        if (!level) continue;
        items.push({
            id: `budget-${b.category_id}`,
            kind: "budget",
            severity: level === "exceeded" ? "danger" : "warning",
            title: level === "exceeded" ? `Superaste el presupuesto de ${b.category_name}` : `Presupuesto de ${b.category_name} casi agotado`,
            detail: `${formatMoney(b.spent)} de ${formatMoney(b.budget)} (${Math.round((b.spent / (b.budget || 1)) * 100)}%)`,
            href: "/user/budgets",
        });
    }
    if (user && !user.email_verified_at) {
        items.push({
            id: "verify-email",
            kind: "verify",
            severity: "info",
            title: "Confirma tu correo",
            detail: "Así podrás recibir recordatorios y recuperar tu cuenta.",
            href: "/user/profile",
        });
    }
    return items;
}

/**
 * Envía por correo los recordatorios de pagos próximos y vencidos.
 * Debe ejecutarse una vez al día (cron, Programador de tareas o Vercel Cron).
 * Cada gasto se recuerda una sola vez como "próximo" y una vez como "vencido".
 */
export async function sendDueReminders() {
    const today = serverToday();
    const users = await allAsync<{ id: number; name: string; email: string; reminder_days: number }>(
        getDb(),
        `SELECT id, name, email, reminder_days FROM users WHERE notify_email = 1 AND email_verified_at IS NOT NULL`
    );

    let emails = 0;
    let items = 0;
    for (const user of users) {
        const horizon = addDays(today, Math.max(1, Number(user.reminder_days)));
        const pending = await listPendingBetween(user.id, addDays(today, -30), horizon);

        const fresh: { id: number; line: string[]; kind: "due" | "overdue" }[] = [];
        for (const e of pending) {
            const kind = e.expense_date < today ? "overdue" : "due";
            const logged = await runAsync(getDb(), `INSERT IGNORE INTO reminder_log (period_expense_id, kind, sent_at) VALUES (?, ?, ?)`, [e.id, kind, nowISO()]);
            if (logged.changes === 1) {
                fresh.push({ id: e.id, kind, line: [`${e.name} — ${dueText(e.expense_date, today)}`, formatMoney(e.amount)] });
            }
        }
        if (fresh.length === 0) continue;

        const overdue = fresh.filter((f) => f.kind === "overdue").length;
        const { html, text } = mailLayout({
            title: overdue ? "Tienes pagos vencidos" : "Pagos que vencen pronto",
            intro: `Hola, ${user.name.split(" ")[0]}. Estos son tus pagos pendientes${overdue ? ", algunos ya vencidos" : " de los próximos días"}:`,
            rows: fresh.map((f) => f.line),
            cta: { label: "Ver mi tablero", url: appUrl("/user/dashboard") },
            outro: "Puedes cambiar o desactivar estos recordatorios en tu perfil.",
        });
        try {
            await sendMail({ to: user.email, subject: overdue ? "⚠️ Tienes pagos vencidos en MizCuentas" : "Recordatorio: pagos próximos", html, text });
            emails++;
            items += fresh.length;
        } catch (error) {
            // Si falla el envío, se libera el registro para reintentar en la próxima ejecución.
            for (const f of fresh) await runAsync(getDb(), `DELETE FROM reminder_log WHERE period_expense_id = ? AND kind = ?`, [f.id, f.kind]);
            console.error(`[reminders] No se pudo enviar a usuario ${user.id}`, error);
        }
    }
    return { users: users.length, emails, items };
}
