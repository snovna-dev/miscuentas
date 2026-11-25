import { allAsync, getAsync, getDb, nowISO, runAsync, withTransaction, type Queryable } from "../index";
import { HttpError } from "@/lib/http";
import { addMonths, clampDateToMonth, parseISODate, toISODate, toYearMonthKey, ymIndex, type YearMonth } from "@/lib/dates";
import { serverCurrentMonth } from "@/lib/serverTime";
import { incomeAccountOf, resolveAccount, syncIncomeLedger } from "./accounts";
import type { Income, IncomeInput, ProjectedIncome, RecurringIncome, RecurringIncomeInput } from "@/types";

const COLUMNS = `i.id, i.user_id, i.amount, i.income_date, i.description, i.recurring_income_id, i.created_at, i.updated_at,
                 bai.bank_account_id, ba.bank_name`;
const FROM = `FROM incomes i
              LEFT JOIN bank_account_incomes bai ON bai.income_id = i.id
              LEFT JOIN bank_accounts ba ON ba.id = bai.bank_account_id`;

const monthRange = (ym: YearMonth) => {
    const next = addMonths(ym, 1);
    return [toISODate(ym.year, ym.month, 1), toISODate(next.year, next.month, 1)] as const;
};

const normalize = (rows: Income[]) => rows.map((r) => ({ ...r, amount: Number(r.amount) }));

export async function createIncome(userId: number, input: IncomeInput) {
    return withTransaction(async (conn) => {
        const result = await runAsync(
            conn,
            `INSERT INTO incomes (user_id, amount, income_date, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, input.amount, input.income_date, input.description, nowISO(), nowISO()]
        );
        const accountId = await resolveAccount(conn, userId, input.bank_account_id);
        await syncIncomeLedger(conn, userId, { id: result.lastID, amount: input.amount, date: input.income_date, description: input.description }, accountId);
        return { id: result.lastID };
    });
}

export async function listIncomesByUser(userId: number, month?: YearMonth) {
    if (month) {
        const [from, to] = monthRange(month);
        return normalize(
            await allAsync<Income>(
                getDb(),
                `SELECT ${COLUMNS} ${FROM}
                 WHERE i.user_id = ? AND i.deleted_at IS NULL AND i.income_date >= ? AND i.income_date < ?
                 ORDER BY i.income_date DESC, i.id DESC`,
                [userId, from, to]
            )
        );
    }
    return normalize(
        await allAsync<Income>(getDb(), `SELECT ${COLUMNS} ${FROM} WHERE i.user_id = ? AND i.deleted_at IS NULL ORDER BY i.income_date DESC, i.id DESC`, [userId])
    );
}

export async function listAllIncomes() {
    return normalize(
        await allAsync<Income>(
            getDb(),
            `SELECT ${COLUMNS}, u.name AS user_name ${FROM} INNER JOIN users u ON u.id = i.user_id
             WHERE i.deleted_at IS NULL ORDER BY i.income_date DESC, i.id DESC LIMIT 1000`
        )
    );
}

/** `userId = null` → acción de administrador sobre cualquier registro. */
export async function updateIncome(id: number, userId: number | null, input: IncomeInput) {
    return withTransaction(async (conn) => {
        const current = await getAsync<{ id: number; user_id: number }>(
            conn,
            `SELECT id, user_id FROM incomes WHERE id = ? AND deleted_at IS NULL ${userId === null ? "" : "AND user_id = ?"} FOR UPDATE`,
            userId === null ? [id] : [id, userId]
        );
        if (!current) throw new HttpError(404, "No se encontró el ingreso.");

        await runAsync(conn, `UPDATE incomes SET amount = ?, income_date = ?, description = ?, updated_at = ? WHERE id = ?`, [
            input.amount,
            input.income_date,
            input.description,
            nowISO(),
            id,
        ]);

        // Si no se indica cuenta, se conserva la que tenía.
        const accountId =
            input.bank_account_id === undefined ? await incomeAccountOf(conn, id) : await resolveAccount(conn, current.user_id, input.bank_account_id);
        await syncIncomeLedger(conn, current.user_id, { id, amount: input.amount, date: input.income_date, description: input.description }, accountId);
        return { id };
    });
}

export async function deleteIncome(id: number, userId: number | null) {
    const result = await runAsync(getDb(), `DELETE FROM incomes WHERE id = ? ${userId === null ? "" : "AND user_id = ?"}`, userId === null ? [id] : [id, userId]);
    if (result.changes === 0) throw new HttpError(404, "No se encontró el ingreso.");
    return { id };
}

/* ---------------------------- Ingresos recurrentes --------------------------- */

const RECURRING_SELECT = `SELECT r.id, r.user_id, r.description, r.amount, r.start_date, r.bank_account_id, ba.bank_name
                          FROM recurring_incomes r LEFT JOIN bank_accounts ba ON ba.id = r.bank_account_id`;

export async function listRecurringIncomes(userId: number) {
    const rows = await allAsync<RecurringIncome>(getDb(), `${RECURRING_SELECT} WHERE r.user_id = ? AND r.deleted_at IS NULL ORDER BY r.start_date`, [userId]);
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/** Crea el registro de un ingreso recurrente en un mes concreto (si aún no existe). */
async function instantiateRecurring(conn: Queryable, userId: number, recurring: RecurringIncome, ym: YearMonth) {
    const [from, to] = monthRange(ym);
    const exists = await getAsync<{ id: number }>(
        conn,
        `SELECT id FROM incomes WHERE recurring_income_id = ? AND income_date >= ? AND income_date < ? LIMIT 1`,
        [recurring.id, from, to]
    );
    if (exists) return null;

    const day = parseISODate(recurring.start_date)?.day ?? 1;
    const date = clampDateToMonth(day, ym.year, ym.month);
    const result = await runAsync(
        conn,
        `INSERT INTO incomes (user_id, amount, income_date, description, recurring_income_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, recurring.amount, date, recurring.description, recurring.id, nowISO(), nowISO()]
    );
    const accountId = recurring.bank_account_id ?? (await resolveAccount(conn, userId, undefined));
    await syncIncomeLedger(conn, userId, { id: result.lastID, amount: Number(recurring.amount), date, description: recurring.description }, accountId);
    return result.lastID;
}

/** Genera los ingresos recurrentes de un mes (se llama una sola vez por usuario y mes). */
export async function generateRecurringIncomes(conn: Queryable, userId: number, ym: YearMonth) {
    const list = await allAsync<RecurringIncome>(
        conn,
        `${RECURRING_SELECT} WHERE r.user_id = ? AND r.deleted_at IS NULL AND LEFT(r.start_date, 7) <= ?`,
        [userId, toYearMonthKey(ym)]
    );
    let inserted = 0;
    for (const recurring of list) if (await instantiateRecurring(conn, userId, recurring, ym)) inserted++;
    return inserted;
}

/**
 * Crea el ingreso recurrente, registra el del mes de inicio y lo agrega a los meses
 * posteriores que ya fueron generados (para que no falte en el mes en curso).
 */
export async function createRecurringIncome(userId: number, input: RecurringIncomeInput) {
    const start = parseISODate(input.start_date);
    if (!start) throw new HttpError(400, "La fecha de inicio no es válida.");

    return withTransaction(async (conn) => {
        const accountId = await resolveAccount(conn, userId, input.bank_account_id);
        const result = await runAsync(
            conn,
            `INSERT INTO recurring_incomes (user_id, bank_account_id, description, amount, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, accountId, input.description, input.amount, input.start_date, nowISO(), nowISO()]
        );
        const recurring: RecurringIncome = { id: result.lastID, user_id: userId, description: input.description, amount: input.amount, start_date: input.start_date, bank_account_id: accountId };

        await instantiateRecurring(conn, userId, recurring, start);
        const generated = await allAsync<{ year: number; month: number }>(
            conn,
            `SELECT p.year, p.month FROM period_generations pg INNER JOIN periods p ON p.id = pg.period_id
             WHERE pg.user_id = ? AND (p.year * 12 + p.month - 1) > ?`,
            [userId, ymIndex(start)]
        );
        for (const ym of generated) await instantiateRecurring(conn, userId, recurring, ym);
        return { id: result.lastID };
    });
}

/** Cambia el ingreso recurrente y actualiza los registros desde el mes en curso. */
export async function updateRecurringIncome(userId: number, id: number, input: RecurringIncomeInput) {
    return withTransaction(async (conn) => {
        const current = await getAsync<RecurringIncome>(conn, `${RECURRING_SELECT} WHERE r.id = ? AND r.user_id = ? AND r.deleted_at IS NULL`, [id, userId]);
        if (!current) throw new HttpError(404, "No se encontró el ingreso recurrente.");
        const accountId = await resolveAccount(conn, userId, input.bank_account_id);

        await runAsync(conn, `UPDATE recurring_incomes SET description = ?, amount = ?, bank_account_id = ?, updated_at = ? WHERE id = ?`, [
            input.description,
            input.amount,
            accountId,
            nowISO(),
            id,
        ]);

        const [from] = monthRange(serverCurrentMonth());
        const instances = await allAsync<{ id: number; income_date: string }>(
            conn,
            `SELECT id, income_date FROM incomes WHERE recurring_income_id = ? AND income_date >= ?`,
            [id, from]
        );
        for (const instance of instances) {
            await runAsync(conn, `UPDATE incomes SET amount = ?, description = ?, updated_at = ? WHERE id = ?`, [input.amount, input.description, nowISO(), instance.id]);
            await syncIncomeLedger(conn, userId, { id: instance.id, amount: input.amount, date: instance.income_date, description: input.description }, accountId);
        }
        return { id, updated: instances.length };
    });
}

/** Deja de repetirse. Los ingresos ya recibidos se conservan; se quitan los de meses futuros. */
export async function stopRecurringIncome(userId: number, id: number) {
    return withTransaction(async (conn) => {
        const result = await runAsync(conn, `UPDATE recurring_incomes SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, [
            nowISO(),
            nowISO(),
            id,
            userId,
        ]);
        if (result.changes === 0) throw new HttpError(404, "No se encontró el ingreso recurrente.");
        const [, nextMonth] = monthRange(serverCurrentMonth());
        await runAsync(conn, `DELETE FROM incomes WHERE recurring_income_id = ? AND income_date >= ?`, [id, nextMonth]);
        return { id };
    });
}

/** Ingresos recurrentes que aún no tienen registro en un mes futuro. */
export async function listProjectedIncomes(userId: number, ym: YearMonth): Promise<ProjectedIncome[]> {
    const [from, to] = monthRange(ym);
    const rows = await allAsync<RecurringIncome>(
        getDb(),
        `${RECURRING_SELECT}
         WHERE r.user_id = ? AND r.deleted_at IS NULL AND LEFT(r.start_date, 7) <= ?
           AND NOT EXISTS (SELECT 1 FROM incomes i WHERE i.recurring_income_id = r.id AND i.income_date >= ? AND i.income_date < ?)`,
        [userId, toYearMonthKey(ym), from, to]
    );
    return rows.map((r) => ({
        recurring_income_id: r.id,
        description: r.description,
        amount: Number(r.amount),
        income_date: clampDateToMonth(parseISODate(r.start_date)?.day ?? 1, ym.year, ym.month),
    }));
}
