import { allAsync, getDb } from "../index";
import { addMonths, monthLabel, toISODate, ymIndex, type YearMonth } from "@/lib/dates";
import { ExpenseState } from "@/emuns/ExpenseState";
import { PeriodType } from "@/emuns/PeriodType";
import type { Expense, Income, PeriodExpense, ReportCategory, ReportData, ReportMonth } from "@/types";

/**
 * Evolución de los últimos N meses (terminando en `end`): ingresos, gastos, ahorro y
 * balance por mes; totales por categoría y comparación con el mes anterior.
 */
export async function getReport(userId: number, end: YearMonth, months: number): Promise<ReportData> {
    const start = addMonths(end, -(months - 1));
    const startIdx = ymIndex(start);
    const endIdx = ymIndex(end);
    const from = toISODate(start.year, start.month, 1);
    const next = addMonths(end, 1);
    const to = toISODate(next.year, next.month, 1);

    const [incomeRows, expenseRows, savingRows, categoryRows] = await Promise.all([
        allAsync<{ ym: string; total: number }>(
            getDb(),
            `SELECT LEFT(income_date, 7) AS ym, SUM(amount) AS total FROM incomes
             WHERE user_id = ? AND deleted_at IS NULL AND income_date >= ? AND income_date < ? GROUP BY ym`,
            [userId, from, to]
        ),
        allAsync<{ year: number; month: number; total: number; paid: number }>(
            getDb(),
            `SELECT p.year, p.month, SUM(pe.amount) AS total,
                    SUM(CASE WHEN pe.expense_state_id = ? THEN pe.amount ELSE 0 END) AS paid
             FROM period_expenses pe
             INNER JOIN expenses e ON e.id = pe.expense_id
             INNER JOIN periods p ON p.id = pe.period_id
             WHERE e.user_id = ? AND p.period_type = ? AND (p.year * 12 + p.month - 1) BETWEEN ? AND ?
             GROUP BY p.year, p.month`,
            [ExpenseState.PAID, userId, PeriodType.MONTHLY, startIdx, endIdx]
        ),
        allAsync<{ ym: string; total: number }>(
            getDb(),
            `SELECT LEFT(c.contribution_date, 7) AS ym, SUM(c.amount) AS total
             FROM savings_contributions c INNER JOIN savings_goals g ON g.id = c.goal_id
             WHERE g.user_id = ? AND c.contribution_date >= ? AND c.contribution_date < ? GROUP BY ym`,
            [userId, from, to]
        ),
        allAsync<{ category_name: string; category_type: number; idx: number; total: number }>(
            getDb(),
            `SELECT ec.name AS category_name, ec.category_type, (p.year * 12 + p.month - 1) AS idx, SUM(pe.amount) AS total
             FROM period_expenses pe
             INNER JOIN expenses e ON e.id = pe.expense_id
             INNER JOIN periods p ON p.id = pe.period_id
             INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
             WHERE e.user_id = ? AND p.period_type = ? AND (p.year * 12 + p.month - 1) BETWEEN ? AND ?
             GROUP BY ec.id, idx`,
            [userId, PeriodType.MONTHLY, Math.min(startIdx, endIdx - 1), endIdx]
        ),
    ]);

    const key = (ym: YearMonth) => `${ym.year}-${String(ym.month).padStart(2, "0")}`;
    const incomeBy = new Map(incomeRows.map((r) => [r.ym, Number(r.total)]));
    const savingBy = new Map(savingRows.map((r) => [r.ym, Number(r.total)]));
    const expenseBy = new Map(expenseRows.map((r) => [`${r.year}-${String(r.month).padStart(2, "0")}`, { total: Number(r.total), paid: Number(r.paid) }]));

    const list: ReportMonth[] = Array.from({ length: months }, (_, i) => {
        const ym = addMonths(start, i);
        const income = incomeBy.get(key(ym)) ?? 0;
        const expense = expenseBy.get(key(ym)) ?? { total: 0, paid: 0 };
        const savings = savingBy.get(key(ym)) ?? 0;
        return { ...ym, label: monthLabel(ym), income, expenses: expense.total, paid: expense.paid, savings, balance: income - expense.total - savings };
    });

    const categories = new Map<string, ReportCategory>();
    for (const row of categoryRows) {
        const item = categories.get(row.category_name) ?? { category_name: row.category_name, category_type: Number(row.category_type), total: 0, current: 0, previous: 0 };
        const idx = Number(row.idx);
        if (idx >= startIdx) item.total += Number(row.total);
        if (idx === endIdx) item.current += Number(row.total);
        if (idx === endIdx - 1) item.previous += Number(row.total);
        categories.set(row.category_name, item);
    }

    const current = list[list.length - 1];
    const previousYm = addMonths(end, -1);
    const previous =
        list.length > 1
            ? list[list.length - 2]
            : { ...previousYm, label: monthLabel(previousYm), income: 0, expenses: 0, paid: 0, savings: 0, balance: 0 };
    // El promedio cuenta desde el primer mes con movimientos (un usuario nuevo no tiene 6 meses de historia).
    const firstActive = list.findIndex((m) => m.income || m.expenses || m.savings);
    const active = firstActive === -1 ? list : list.slice(firstActive);
    const avg = (pick: (m: ReportMonth) => number) => Math.round(active.reduce((acc, m) => acc + pick(m), 0) / active.length);

    return {
        months: list,
        categories: [...categories.values()].filter((c) => c.total > 0 || c.current > 0 || c.previous > 0).sort((a, b) => b.total - a.total),
        current,
        previous,
        averages: { income: avg((m) => m.income), expenses: avg((m) => m.expenses), savings: avg((m) => m.savings) },
    };
}

/** Detalle para exportar a Excel. */
export async function getReportDetail(userId: number, end: YearMonth, months: number) {
    const start = addMonths(end, -(months - 1));
    const from = toISODate(start.year, start.month, 1);
    const next = addMonths(end, 1);
    const to = toISODate(next.year, next.month, 1);

    const [expenses, incomes] = await Promise.all([
        allAsync<PeriodExpense & Pick<Expense, "frequency_months">>(
            getDb(),
            `SELECT p.year, p.month, e.name, ec.name AS category_name, ec.category_type, pe.expense_date, pe.amount, es.name AS state
             FROM period_expenses pe
             INNER JOIN expenses e ON e.id = pe.expense_id
             INNER JOIN periods p ON p.id = pe.period_id
             INNER JOIN expense_states es ON es.id = pe.expense_state_id
             INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
             WHERE e.user_id = ? AND p.period_type = ? AND (p.year * 12 + p.month - 1) BETWEEN ? AND ?
             ORDER BY p.year, p.month, pe.expense_date`,
            [userId, PeriodType.MONTHLY, ymIndex(start), ymIndex(end)]
        ),
        allAsync<Income>(
            getDb(),
            `SELECT income_date, description, amount FROM incomes
             WHERE user_id = ? AND deleted_at IS NULL AND income_date >= ? AND income_date < ? ORDER BY income_date`,
            [userId, from, to]
        ),
    ]);
    return { expenses, incomes };
}
