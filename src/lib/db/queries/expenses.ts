import { allAsync, getAsync, getDb, nowISO, runAsync, withTransaction } from "../index";
import { HttpError } from "@/lib/http";
import { ymIndex } from "@/lib/dates";
import { serverCurrentMonth } from "@/lib/serverTime";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import { ExpenseState } from "@/emuns/ExpenseState";
import type { Expense, ExpenseInput } from "@/types";

const SELECT_EXPENSE = `
    SELECT e.id, e.user_id, e.expense_category_id, ec.name AS category_name, ec.category_type,
           e.name, e.description, e.expense_date, e.amount, e.frequency_months, e.installments, e.created_at, e.updated_at, e.deleted_at
    FROM expenses e
    INNER JOIN expense_categories ec ON ec.id = e.expense_category_id`;

/** Gastos fijos activos (plantillas que se repiten cada mes). */
export async function listFixedExpensesByUser(userId: number) {
    return allAsync<Expense>(
        getDb(),
        `${SELECT_EXPENSE} WHERE e.user_id = ? AND ec.category_type = ? AND e.deleted_at IS NULL ORDER BY e.expense_date, e.name`,
        [userId, ExpenseCategoryType.FIXED]
    );
}

export async function listExpensesByUser(userId: number) {
    return allAsync<Expense>(
        getDb(),
        `${SELECT_EXPENSE} WHERE e.user_id = ? AND e.deleted_at IS NULL ORDER BY e.expense_date DESC, e.id DESC`,
        [userId]
    );
}

export async function listAllExpenses() {
    return allAsync<Expense>(
        getDb(),
        `SELECT x.*, u.name AS user_name FROM (${SELECT_EXPENSE} WHERE e.deleted_at IS NULL) x
         INNER JOIN users u ON u.id = x.user_id
         ORDER BY x.expense_date DESC, x.id DESC LIMIT 1000`
    );
}

/** Crea solo la definición (uso administrativo). */
export async function createExpense(userId: number, input: ExpenseInput) {
    const result = await runAsync(
        getDb(),
        `INSERT INTO expenses (user_id, expense_category_id, name, description, expense_date, amount, frequency_months, installments, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, input.expense_category_id, input.name, input.description, input.expense_date, input.amount, input.frequency_months ?? 1, input.installments ?? null, nowISO(), nowISO()]
    );
    return { id: result.lastID };
}

async function getOwnedExpense(id: number, userId: number | null) {
    const row = await getAsync<Expense>(
        getDb(),
        `${SELECT_EXPENSE} WHERE e.id = ? AND e.deleted_at IS NULL ${userId === null ? "" : "AND e.user_id = ?"}`,
        userId === null ? [id] : [id, userId]
    );
    if (!row) throw new HttpError(404, "No se encontró el gasto.");
    return row;
}

/**
 * Actualiza la definición del gasto. Si es fijo, también actualiza el valor de los
 * registros PENDIENTES desde el mes actual en adelante (p. ej. subió el arriendo).
 */
export async function updateExpense(id: number, userId: number | null, input: ExpenseInput) {
    const current = await getOwnedExpense(id, userId);

    return withTransaction(async (conn) => {
        const category = await getAsync<{ category_type: number }>(
            conn,
            `SELECT category_type FROM expense_categories WHERE id = ?`,
            [input.expense_category_id]
        );
        if (!category) throw new HttpError(400, "La categoría seleccionada no existe.");
        if (Number(current.category_type) === ExpenseCategoryType.FIXED && Number(category.category_type) !== ExpenseCategoryType.FIXED) {
            throw new HttpError(400, "Un gasto fijo debe conservar una categoría de tipo fijo.");
        }

        await runAsync(
            conn,
            `UPDATE expenses SET expense_category_id = ?, name = ?, description = ?, expense_date = ?, amount = ?,
                    frequency_months = ?, installments = ?, updated_at = ? WHERE id = ?`,
            [
                input.expense_category_id,
                input.name,
                input.description,
                input.expense_date,
                input.amount,
                input.frequency_months ?? current.frequency_months ?? 1,
                input.installments === undefined ? (current.installments ?? null) : input.installments,
                nowISO(),
                id,
            ]
        );

        let updatedInstances = 0;
        if (Number(current.category_type) === ExpenseCategoryType.FIXED) {
            const result = await runAsync(
                conn,
                `UPDATE period_expenses pe
                 INNER JOIN periods p ON p.id = pe.period_id
                 SET pe.amount = ?, pe.updated_at = ?
                 WHERE pe.expense_id = ? AND pe.expense_state_id = ? AND (p.year * 12 + p.month - 1) >= ?`,
                [input.amount, nowISO(), id, ExpenseState.PENDING, ymIndex(serverCurrentMonth())]
            );
            updatedInstances = result.changes;
        }

        return { id, updatedInstances };
    });
}

/**
 * Borrado lógico: deja de repetirse y se quitan los pendientes desde este mes,
 * pero el historial (meses anteriores y pagos realizados) se conserva.
 * Antes el DELETE en cascada borraba todo el historial de pagos.
 */
export async function deleteExpense(id: number, userId: number | null) {
    await getOwnedExpense(id, userId);

    return withTransaction(async (conn) => {
        await runAsync(conn, `UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?`, [nowISO(), nowISO(), id]);
        const removed = await runAsync(
            conn,
            `DELETE pe FROM period_expenses pe
             INNER JOIN periods p ON p.id = pe.period_id
             WHERE pe.expense_id = ? AND pe.expense_state_id = ? AND (p.year * 12 + p.month - 1) >= ?`,
            [id, ExpenseState.PENDING, ymIndex(serverCurrentMonth())]
        );
        return { id, removedPending: removed.changes };
    });
}
