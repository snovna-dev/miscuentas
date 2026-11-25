import { allAsync, getAsync, nowISO, runAsync, withTransaction, getDb, type Queryable } from "../index";
import { getOrCreateMonthPeriod } from "./periods";
import { paymentAccountOf, resolveAccount, syncExpensePayment } from "./accounts";
import { generateRecurringIncomes } from "./incomes";
import { budgetAlertFor } from "./budgets";
import { HttpError } from "@/lib/http";
import { clampDateToMonth, daysInMonth, monthLabel, parseISODate, relativeMonth, toYearMonthKey, ymIndex, type YearMonth } from "@/lib/dates";
import { SQL_START_INDEX } from "@/lib/schedule";
import { serverCurrentMonth } from "@/lib/serverTime";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import { ExpenseState } from "@/emuns/ExpenseState";
import { PeriodType } from "@/emuns/PeriodType";
import type { BudgetAlert, CreatedPeriodExpense, ExpenseInput, ExpenseKind, PeriodExpense, PeriodExpensePatch, ProjectedExpense } from "@/types";

const PERIOD_INDEX_SQL = `(p.year * 12 + p.month - 1)`;
const START_INDEX = SQL_START_INDEX("e.expense_date");

const SELECT_PERIOD_EXPENSE = `
    SELECT
        pe.id,
        pe.period_id,
        p.id AS month_id,
        p.year,
        p.month,
        p.name AS month_name,
        e.id AS expense_id,
        e.name,
        e.description,
        ec.id AS category_id,
        ec.name AS category_name,
        ec.category_type,
        pe.expense_date,
        pe.amount,
        pe.expense_state_id AS state_id,
        es.name AS state,
        e.frequency_months,
        e.installments AS installments_total,
        CASE WHEN e.installments IS NULL THEN NULL
             ELSE FLOOR((${PERIOD_INDEX_SQL} - ${START_INDEX}) / GREATEST(e.frequency_months, 1)) + 1 END AS installment_number,
        tx.account_id AS paid_account_id,
        ba.bank_name AS paid_account_name
    FROM period_expenses pe
    INNER JOIN expenses e ON e.id = pe.expense_id
    INNER JOIN periods p ON p.id = pe.period_id
    INNER JOIN expense_states es ON es.id = pe.expense_state_id
    INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
    LEFT JOIN transactions tx ON tx.period_expense_id = pe.id
    LEFT JOIN bank_accounts ba ON ba.id = tx.account_id`;

const ORDER = `ORDER BY p.year, p.month, pe.expense_date, pe.id`;

/** Condición SQL: el gasto fijo se cobra en el mes cuyo índice es `?` (frecuencia + cuotas). */
const DUE_IN_MONTH = `
    MOD(? - ${START_INDEX}, GREATEST(e.frequency_months, 1)) = 0
    AND ? >= ${START_INDEX}
    AND (e.installments IS NULL OR FLOOR((? - ${START_INDEX}) / GREATEST(e.frequency_months, 1)) < e.installments)`;

const normalize = (rows: PeriodExpense[]) =>
    rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        installment_number: r.installment_number == null ? null : Number(r.installment_number),
        installments_total: r.installments_total == null ? null : Number(r.installments_total),
    }));

/* --------------------------------- Lecturas -------------------------------- */

export async function listPeriodExpensesByUserAndPeriod(userId: number, periodId: number) {
    return normalize(await allAsync<PeriodExpense>(getDb(), `${SELECT_PERIOD_EXPENSE} WHERE e.user_id = ? AND pe.period_id = ? ${ORDER}`, [userId, periodId]));
}

export async function listPeriodExpensesByMonth(userId: number, { year, month }: YearMonth) {
    return normalize(
        await allAsync<PeriodExpense>(
            getDb(),
            `${SELECT_PERIOD_EXPENSE} WHERE e.user_id = ? AND p.period_type = ? AND p.year = ? AND p.month = ? ${ORDER}`,
            [userId, PeriodType.MONTHLY, year, month]
        )
    );
}

/** Pendientes de meses ANTERIORES al indicado. */
export async function listOverdueExpenses(userId: number, before: YearMonth) {
    return normalize(
        await allAsync<PeriodExpense>(
            getDb(),
            `${SELECT_PERIOD_EXPENSE}
             WHERE e.user_id = ? AND pe.expense_state_id = ? AND p.period_type = ? AND ${PERIOD_INDEX_SQL} < ? ${ORDER}`,
            [userId, ExpenseState.PENDING, PeriodType.MONTHLY, ymIndex(before)]
        )
    );
}

/** Gastos ya registrados para meses posteriores (p. ej. con fecha futura). */
export async function listUpcomingExpenses(userId: number, after: YearMonth, limit = 30) {
    return normalize(
        await allAsync<PeriodExpense>(
            getDb(),
            `${SELECT_PERIOD_EXPENSE} WHERE e.user_id = ? AND p.period_type = ? AND ${PERIOD_INDEX_SQL} > ? ${ORDER} LIMIT ?`,
            [userId, PeriodType.MONTHLY, ymIndex(after), limit]
        )
    );
}

/** Pendientes con fecha entre `from` y `to` (recordatorios y notificaciones). */
export async function listPendingBetween(userId: number, from: string, to: string) {
    return normalize(
        await allAsync<PeriodExpense>(
            getDb(),
            `${SELECT_PERIOD_EXPENSE} WHERE e.user_id = ? AND pe.expense_state_id = ? AND pe.expense_date >= ? AND pe.expense_date <= ? ${ORDER}`,
            [userId, ExpenseState.PENDING, from, to]
        )
    );
}

/** Gastos fijos que aún no tienen registro en un mes futuro (respeta frecuencia y cuotas). */
export async function listProjectedFixedExpenses(userId: number, ym: YearMonth): Promise<ProjectedExpense[]> {
    const index = ymIndex(ym);
    const rows = await allAsync<ProjectedExpense & { frequency_months: number }>(
        getDb(),
        `SELECT e.id AS expense_id, e.name, ec.name AS category_name, ec.category_type, e.amount, e.expense_date, e.frequency_months,
                e.installments AS installments_total,
                CASE WHEN e.installments IS NULL THEN NULL ELSE FLOOR((? - ${START_INDEX}) / GREATEST(e.frequency_months, 1)) + 1 END AS installment_number
         FROM expenses e
         INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
         WHERE e.user_id = ? AND ec.category_type = ? AND e.deleted_at IS NULL AND ${DUE_IN_MONTH}
           AND NOT EXISTS (
               SELECT 1 FROM period_expenses x INNER JOIN periods p ON p.id = x.period_id
               WHERE x.expense_id = e.id AND p.period_type = ? AND p.year = ? AND p.month = ?)
         ORDER BY e.expense_date, e.name`,
        [index, userId, ExpenseCategoryType.FIXED, index, index, index, PeriodType.MONTHLY, ym.year, ym.month]
    );

    return rows.map((row) => ({
        expense_id: row.expense_id,
        name: row.name,
        category_name: row.category_name,
        category_type: row.category_type,
        amount: Number(row.amount),
        expense_date: clampDateToMonth(parseISODate(row.expense_date)?.day ?? 1, ym.year, ym.month),
        installment_number: row.installment_number == null ? null : Number(row.installment_number),
        installments_total: row.installments_total == null ? null : Number(row.installments_total),
    }));
}

/* --------------------------- Generación mensual ---------------------------- */

/**
 * Registra UNA sola vez por usuario y mes:
 *  - los gastos fijos que tocan ese mes (según frecuencia y cuotas),
 *  - los ingresos recurrentes.
 * Se controla con `period_generations` y cada gasto se valida con NOT EXISTS.
 */
export async function ensureMonthGenerated(userId: number, ym: YearMonth) {
    return withTransaction(async (conn) => {
        const period = await getOrCreateMonthPeriod(conn, ym);
        const marker = await runAsync(conn, `INSERT IGNORE INTO period_generations (user_id, period_id, created_at) VALUES (?, ?, ?)`, [
            userId,
            period.id,
            nowISO(),
        ]);
        if (marker.changes === 0) return { periodId: period.id, inserted: 0, incomes: 0 };

        const index = ymIndex(ym);
        const result = await runAsync(
            conn,
            `INSERT INTO period_expenses (period_id, expense_id, expense_date, amount, expense_state_id, created_at)
             SELECT ?, e.id,
                    CONCAT(?, '-', LPAD(LEAST(GREATEST(CAST(SUBSTRING(e.expense_date, 9, 2) AS UNSIGNED), 1), ?), 2, '0')),
                    e.amount, ?, ?
             FROM expenses e
             INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
             WHERE e.user_id = ? AND ec.category_type = ? AND e.deleted_at IS NULL AND ${DUE_IN_MONTH}
               AND NOT EXISTS (SELECT 1 FROM period_expenses x WHERE x.expense_id = e.id AND x.period_id = ?)`,
            [
                period.id,
                toYearMonthKey(ym),
                daysInMonth(ym.year, ym.month),
                ExpenseState.PENDING,
                nowISO(),
                userId,
                ExpenseCategoryType.FIXED,
                index,
                index,
                index,
                period.id,
            ]
        );
        const incomes = await generateRecurringIncomes(conn, userId, ym);
        return { periodId: period.id, inserted: result.changes, incomes };
    });
}

/** Compatibilidad con el nombre anterior. */
export const ensureFixedExpensesForMonth = ensureMonthGenerated;

/**
 * Un gasto fijo creado con fecha pasada se agrega también a los meses posteriores
 * ya generados (respetando su frecuencia y cuotas).
 */
async function propagateFixedExpense(conn: Queryable, userId: number, expenseId: number, start: YearMonth) {
    await runAsync(
        conn,
        `INSERT INTO period_expenses (period_id, expense_id, expense_date, amount, expense_state_id, created_at)
         SELECT p.id, e.id,
                CONCAT(p.year, '-', LPAD(p.month, 2, '0'), '-',
                       LPAD(LEAST(GREATEST(CAST(SUBSTRING(e.expense_date, 9, 2) AS UNSIGNED), 1),
                                  DAY(LAST_DAY(CONCAT(p.year, '-', LPAD(p.month, 2, '0'), '-01')))), 2, '0')),
                e.amount, ?, ?
         FROM period_generations pg
         INNER JOIN periods p ON p.id = pg.period_id
         INNER JOIN expenses e ON e.id = ?
         WHERE pg.user_id = ? AND ${PERIOD_INDEX_SQL} > ?
           AND MOD(${PERIOD_INDEX_SQL} - ${START_INDEX}, GREATEST(e.frequency_months, 1)) = 0
           AND (e.installments IS NULL OR FLOOR((${PERIOD_INDEX_SQL} - ${START_INDEX}) / GREATEST(e.frequency_months, 1)) < e.installments)
           AND NOT EXISTS (SELECT 1 FROM period_expenses x WHERE x.expense_id = e.id AND x.period_id = p.id)`,
        [ExpenseState.PENDING, nowISO(), expenseId, userId, ymIndex(start)]
    );
}

/* -------------------------------- Escrituras ------------------------------- */

async function getCategoryType(conn: Queryable, categoryId: number) {
    const category = await getAsync<{ category_type: number }>(conn, `SELECT category_type FROM expense_categories WHERE id = ?`, [categoryId]);
    if (!category) throw new HttpError(400, "La categoría seleccionada no existe.");
    return Number(category.category_type);
}

/**
 * Crea un gasto y lo registra en el mes que corresponde a SU FECHA.
 * Misma regla para fijos y variables: una fecha superior a hoy queda en el mes de esa fecha.
 * Devuelve además una alerta si el gasto acerca o supera el presupuesto de su categoría.
 */
export async function createExpenseWithPeriod(
    userId: number,
    input: ExpenseInput,
    kind: ExpenseKind
): Promise<CreatedPeriodExpense & { budgetAlert: BudgetAlert | null }> {
    const parts = parseISODate(input.expense_date);
    if (!parts) throw new HttpError(400, "La fecha no es válida.");
    const target: YearMonth = { year: parts.year, month: parts.month };
    const frequency = kind === "fixed" ? (input.frequency_months ?? 1) : 1;
    const installments = kind === "fixed" ? (input.installments ?? null) : null;

    const created = await withTransaction(async (conn) => {
        const categoryType = await getCategoryType(conn, input.expense_category_id);
        const expected = kind === "fixed" ? ExpenseCategoryType.FIXED : ExpenseCategoryType.VARIABLE;
        if (categoryType !== expected) {
            throw new HttpError(400, kind === "fixed" ? "Selecciona una categoría de gasto fijo." : "Selecciona una categoría de gasto variable.");
        }

        const period = await getOrCreateMonthPeriod(conn, target);
        const expense = await runAsync(
            conn,
            `INSERT INTO expenses (user_id, expense_category_id, name, description, expense_date, amount, frequency_months, installments, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, input.expense_category_id, input.name, input.description, input.expense_date, input.amount, frequency, installments, nowISO(), nowISO()]
        );
        const instance = await runAsync(
            conn,
            `INSERT INTO period_expenses (period_id, expense_id, expense_date, amount, expense_state_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [period.id, expense.lastID, input.expense_date, input.amount, ExpenseState.PENDING, nowISO()]
        );
        if (kind === "fixed") await propagateFixedExpense(conn, userId, expense.lastID, target);

        return {
            id: instance.lastID,
            period: { id: period.id, ...target, label: monthLabel(target) },
            relative: relativeMonth(target, serverCurrentMonth()),
        };
    });

    const budgetAlert = await budgetAlertFor(userId, input.expense_category_id, target);
    return { ...created, budgetAlert };
}

type OwnedRow = {
    id: number;
    period_id: number;
    expense_id: number;
    user_id: number;
    name: string;
    category_type: number;
    expense_date: string;
    amount: number;
    expense_state_id: number;
};

/** Carga un gasto del período verificando que pertenezca al usuario (o cualquiera si es admin). */
async function getOwnedPeriodExpense(conn: Queryable, id: number, userId: number | null) {
    const row = await getAsync<OwnedRow>(
        conn,
        `SELECT pe.id, pe.period_id, pe.expense_id, e.user_id, e.name, ec.category_type, pe.expense_date, pe.amount, pe.expense_state_id
         FROM period_expenses pe
         INNER JOIN expenses e ON e.id = pe.expense_id
         INNER JOIN expense_categories ec ON ec.id = e.expense_category_id
         WHERE pe.id = ? ${userId === null ? "" : "AND e.user_id = ?"}
         FOR UPDATE`,
        userId === null ? [id] : [id, userId]
    );
    // 404 (y no 403) para no revelar si el registro de otro usuario existe.
    if (!row) throw new HttpError(404, "No se encontró el gasto.");
    return row;
}

export async function updatePeriodExpense(id: number, userId: number | null, patch: PeriodExpensePatch) {
    return withTransaction(async (conn) => {
        const current = await getOwnedPeriodExpense(conn, id, userId);

        const amount = patch.amount ?? Number(current.amount);
        const state = patch.expense_state_id ?? Number(current.expense_state_id);
        const date = patch.expense_date ?? current.expense_date;
        let periodId = current.period_id;
        let moved: (YearMonth & { label: string }) | null = null;

        // Si la nueva fecha cae en otro mes, el gasto se mueve a ese período (misma regla que al crear).
        if (patch.expense_date && patch.expense_date !== current.expense_date) {
            const parts = parseISODate(patch.expense_date)!;
            const period = await getOrCreateMonthPeriod(conn, parts);
            if (period.id !== current.period_id) {
                periodId = period.id;
                moved = { year: parts.year, month: parts.month, label: monthLabel(parts) };
            }
        }

        await runAsync(
            conn,
            `UPDATE period_expenses SET period_id = ?, expense_date = ?, amount = ?, expense_state_id = ?, updated_at = ? WHERE id = ?`,
            [periodId, date, amount, state, nowISO(), id]
        );

        // Nombre/descr./categoría viven en la definición: solo se editan aquí si el gasto es variable.
        const editsDefinition = patch.name !== undefined || patch.description !== undefined || patch.expense_category_id !== undefined;
        if (editsDefinition && Number(current.category_type) !== ExpenseCategoryType.FIXED) {
            if (patch.expense_category_id !== undefined) {
                const type = await getCategoryType(conn, patch.expense_category_id);
                if (type === ExpenseCategoryType.FIXED) throw new HttpError(400, "Selecciona una categoría de gasto variable.");
            }
            await runAsync(
                conn,
                `UPDATE expenses SET name = COALESCE(?, name), description = COALESCE(?, description),
                        expense_category_id = COALESCE(?, expense_category_id), expense_date = ?, amount = ?, updated_at = ?
                 WHERE id = ?`,
                [patch.name ?? null, patch.description ?? null, patch.expense_category_id ?? null, date, amount, nowISO(), current.expense_id]
            );
        }

        // Saldo por cuenta: al pagar se descuenta de la cuenta (la principal si no se indica otra).
        const paid = state === ExpenseState.PAID;
        const previousAccount = await paymentAccountOf(conn, id);
        const accountId = paid
            ? patch.bank_account_id !== undefined
                ? await resolveAccount(conn, current.user_id, patch.bank_account_id)
                : (previousAccount ?? (await resolveAccount(conn, current.user_id, undefined)))
            : null;
        await syncExpensePayment(conn, current.user_id, { periodExpenseId: id, paid, amount, date, description: patch.name ?? current.name }, accountId);

        return { id, moved };
    });
}

export async function deletePeriodExpense(id: number, userId: number | null) {
    return withTransaction(async (conn) => {
        const current = await getOwnedPeriodExpense(conn, id, userId);
        await runAsync(conn, `DELETE FROM period_expenses WHERE id = ?`, [id]);

        // Un gasto variable es único: si ya no tiene registros, se elimina su definición.
        if (Number(current.category_type) !== ExpenseCategoryType.FIXED) {
            await runAsync(conn, `DELETE FROM expenses WHERE id = ? AND NOT EXISTS (SELECT 1 FROM period_expenses WHERE expense_id = ?)`, [
                current.expense_id,
                current.expense_id,
            ]);
        }
        return { id };
    });
}

export async function adminListPeriodExpenses(userId: number, periodId: number) {
    return listPeriodExpensesByUserAndPeriod(userId, periodId);
}
