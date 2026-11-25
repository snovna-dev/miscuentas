import { allAsync, getAsync, getDb, nowISO, runAsync, withTransaction } from "../index";
import { HttpError } from "@/lib/http";
import { addMonths, toISODate, type YearMonth } from "@/lib/dates";
import { serverCurrentMonth } from "@/lib/serverTime";
import { insertTransaction, resolveAccount } from "./accounts";
import type { SavingsContribution, SavingsGoal, SavingsGoalInput } from "@/types";

const monthRange = (ym: YearMonth) => {
    const next = addMonths(ym, 1);
    return [toISODate(ym.year, ym.month, 1), toISODate(next.year, next.month, 1)] as const;
};

export async function listGoals(userId: number, ym: YearMonth = serverCurrentMonth()) {
    const [from, to] = monthRange(ym);
    const rows = await allAsync<SavingsGoal>(
        getDb(),
        `SELECT g.id, g.name, g.target_amount, g.target_date, g.color, g.created_at,
                COALESCE(SUM(c.amount), 0) AS saved,
                COALESCE(SUM(CASE WHEN c.contribution_date >= ? AND c.contribution_date < ? THEN c.amount ELSE 0 END), 0) AS month_saved,
                COUNT(c.id) AS contributions
         FROM savings_goals g
         LEFT JOIN savings_contributions c ON c.goal_id = g.id
         WHERE g.user_id = ? AND g.deleted_at IS NULL
         GROUP BY g.id
         ORDER BY g.created_at`,
        [from, to, userId]
    );
    return rows.map((g) => ({
        ...g,
        target_amount: Number(g.target_amount),
        saved: Number(g.saved),
        month_saved: Number(g.month_saved),
        contributions: Number(g.contributions),
    }));
}

/** Total aportado (neto) a metas en un mes: se descuenta del disponible del tablero. */
export async function monthSavings(userId: number, ym: YearMonth) {
    const [from, to] = monthRange(ym);
    const row = await getAsync<{ total: number }>(
        getDb(),
        `SELECT COALESCE(SUM(c.amount), 0) AS total FROM savings_contributions c
         INNER JOIN savings_goals g ON g.id = c.goal_id
         WHERE g.user_id = ? AND c.contribution_date >= ? AND c.contribution_date < ?`,
        [userId, from, to]
    );
    return Number(row?.total ?? 0);
}

async function ownedGoal(userId: number, goalId: number) {
    const goal = await getAsync<{ id: number; name: string }>(getDb(), `SELECT id, name FROM savings_goals WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, [goalId, userId]);
    if (!goal) throw new HttpError(404, "No se encontró la meta.");
    return goal;
}

export async function createGoal(userId: number, input: SavingsGoalInput) {
    const result = await runAsync(
        getDb(),
        `INSERT INTO savings_goals (user_id, name, target_amount, target_date, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, input.name, input.target_amount, input.target_date, input.color, nowISO(), nowISO()]
    );
    return { id: result.lastID };
}

export async function updateGoal(userId: number, goalId: number, input: SavingsGoalInput) {
    await ownedGoal(userId, goalId);
    await runAsync(getDb(), `UPDATE savings_goals SET name = ?, target_amount = ?, target_date = ?, color = ?, updated_at = ? WHERE id = ?`, [
        input.name,
        input.target_amount,
        input.target_date,
        input.color,
        nowISO(),
        goalId,
    ]);
}

/** Borrado lógico: los aportes (y sus movimientos de cuenta) se conservan como historial. */
export async function deleteGoal(userId: number, goalId: number) {
    await ownedGoal(userId, goalId);
    await runAsync(getDb(), `UPDATE savings_goals SET deleted_at = ?, updated_at = ? WHERE id = ?`, [nowISO(), nowISO(), goalId]);
}

export async function listContributions(userId: number, goalId: number) {
    await ownedGoal(userId, goalId);
    const rows = await allAsync<SavingsContribution>(
        getDb(),
        `SELECT c.id, c.goal_id, c.amount, c.contribution_date, c.note, c.bank_account_id, b.bank_name
         FROM savings_contributions c LEFT JOIN bank_accounts b ON b.id = c.bank_account_id
         WHERE c.goal_id = ? ORDER BY c.contribution_date DESC, c.id DESC`,
        [goalId]
    );
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/**
 * Aporte (monto positivo) o retiro (negativo). Si se elige una cuenta, el dinero sale
 * (o vuelve) de esa cuenta en el libro de movimientos.
 */
export async function addContribution(
    userId: number,
    goalId: number,
    data: { amount: number; date: string; note: string; bank_account_id?: number | null }
) {
    const goal = await ownedGoal(userId, goalId);
    return withTransaction(async (conn) => {
        if (data.amount < 0) {
            const saved = await getAsync<{ total: number }>(conn, `SELECT COALESCE(SUM(amount), 0) AS total FROM savings_contributions WHERE goal_id = ?`, [goalId]);
            if (Math.abs(data.amount) > Number(saved?.total ?? 0)) throw new HttpError(400, "No puedes retirar más de lo ahorrado en esta meta.");
        }
        const accountId = await resolveAccount(conn, userId, data.bank_account_id);
        const result = await runAsync(
            conn,
            `INSERT INTO savings_contributions (goal_id, bank_account_id, amount, contribution_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [goalId, accountId, data.amount, data.date, data.note || null, nowISO()]
        );
        if (accountId) {
            await insertTransaction(conn, {
                userId,
                accountId,
                amount: -data.amount,
                date: data.date,
                description: `${data.amount >= 0 ? "Ahorro" : "Retiro de ahorro"}: ${goal.name}`,
                kind: "saving",
                savings_contribution_id: result.lastID,
            });
        }
        return { id: result.lastID };
    });
}

export async function deleteContribution(userId: number, contributionId: number) {
    const result = await runAsync(
        getDb(),
        `DELETE c FROM savings_contributions c INNER JOIN savings_goals g ON g.id = c.goal_id WHERE c.id = ? AND g.user_id = ?`,
        [contributionId, userId]
    );
    if (result.changes === 0) throw new HttpError(404, "No se encontró el aporte.");
}
