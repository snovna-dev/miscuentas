import { allAsync, getAsync, getDb, nowISO, runAsync } from "../index";
import { HttpError } from "@/lib/http";
import { PeriodType } from "@/emuns/PeriodType";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import type { BudgetAlert, BudgetStatus } from "@/types";
import type { YearMonth } from "@/lib/dates";

/** Umbral a partir del cual se avisa que el presupuesto está por agotarse. */
export const BUDGET_WARNING = 0.8;

const SPENT_SUBQUERY = `
    SELECT e.expense_category_id AS category_id, SUM(pe.amount) AS spent
    FROM period_expenses pe
    INNER JOIN expenses e ON e.id = pe.expense_id
    INNER JOIN periods p ON p.id = pe.period_id
    WHERE e.user_id = ? AND p.period_type = ? AND p.year = ? AND p.month = ?
    GROUP BY e.expense_category_id`;

/**
 * Todas las categorías de gasto con su presupuesto (si existe) y lo gastado en el mes.
 * Lo "gastado" incluye pagado y pendiente: es el compromiso real del mes.
 */
export async function listBudgetStatus(userId: number, ym: YearMonth, onlyWithBudget = false) {
    const rows = await allAsync<BudgetStatus>(
        getDb(),
        `SELECT c.id AS category_id, c.name AS category_name, c.category_type, b.amount AS budget, COALESCE(s.spent, 0) AS spent
         FROM expense_categories c
         LEFT JOIN budgets b ON b.expense_category_id = c.id AND b.user_id = ?
         LEFT JOIN (${SPENT_SUBQUERY}) s ON s.category_id = c.id
         WHERE c.category_type IN (?, ?) ${onlyWithBudget ? "AND b.amount IS NOT NULL" : ""}
         ORDER BY (b.amount IS NULL), c.category_type, c.name`,
        [userId, userId, PeriodType.MONTHLY, ym.year, ym.month, ExpenseCategoryType.FIXED, ExpenseCategoryType.VARIABLE]
    );
    return rows.map((r) => ({ ...r, budget: r.budget == null ? null : Number(r.budget), spent: Number(r.spent) }));
}

export async function upsertBudget(userId: number, categoryId: number, amount: number) {
    const category = await getAsync<{ id: number }>(getDb(), `SELECT id FROM expense_categories WHERE id = ?`, [categoryId]);
    if (!category) throw new HttpError(400, "La categoría no existe.");
    await runAsync(
        getDb(),
        `INSERT INTO budgets (user_id, expense_category_id, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = VALUES(updated_at)`,
        [userId, categoryId, amount, nowISO(), nowISO()]
    );
}

export async function deleteBudget(userId: number, categoryId: number) {
    await runAsync(getDb(), `DELETE FROM budgets WHERE user_id = ? AND expense_category_id = ?`, [userId, categoryId]);
}

export function alertLevel(budget: number | null, spent: number): BudgetAlert["level"] | null {
    if (!budget || budget <= 0) return null;
    if (spent > budget) return "exceeded";
    if (spent >= budget * BUDGET_WARNING) return "warning";
    return null;
}

/** Alerta para una categoría tras registrar un gasto (null si va bien o no tiene presupuesto). */
export async function budgetAlertFor(userId: number, categoryId: number, ym: YearMonth): Promise<BudgetAlert | null> {
    const row = await getAsync<{ category_name: string; budget: number | null; spent: number }>(
        getDb(),
        `SELECT c.name AS category_name, b.amount AS budget, COALESCE(s.spent, 0) AS spent
         FROM expense_categories c
         LEFT JOIN budgets b ON b.expense_category_id = c.id AND b.user_id = ?
         LEFT JOIN (${SPENT_SUBQUERY}) s ON s.category_id = c.id
         WHERE c.id = ?`,
        [userId, userId, PeriodType.MONTHLY, ym.year, ym.month, categoryId]
    );
    if (!row || row.budget == null) return null;
    const level = alertLevel(Number(row.budget), Number(row.spent));
    return level ? { category_name: row.category_name, budget: Number(row.budget), spent: Number(row.spent), level } : null;
}
