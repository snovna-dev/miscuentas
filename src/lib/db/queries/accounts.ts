import { allAsync, getAsync, getDb, nowISO, runAsync, withTransaction, type Queryable } from "../index";
import { HttpError } from "@/lib/http";
import type { AccountTransaction, BankAccount } from "@/types";

/**
 * Libro de movimientos por cuenta (tabla `transactions`).
 * Saldo = saldo inicial (bank_accounts.account_balance) + SUM(transactions.amount).
 * Ingresos (+), pagos de gastos (−), aportes a ahorro (−/+), ajustes y transferencias.
 */

type Kind = AccountTransaction["kind"];

type Link = { income_id?: number; period_expense_id?: number; savings_contribution_id?: number };

export async function listAccountsWithBalance(userId: number) {
    const rows = await allAsync<BankAccount>(
        getDb(),
        `SELECT b.id, b.user_id, b.account_number, b.account_type, b.bank_name, b.account_balance, b.created_at, b.updated_at,
                b.account_balance + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = b.id), 0) AS balance
         FROM bank_accounts b
         WHERE b.user_id = ? AND b.deleted_at IS NULL
         ORDER BY b.id`,
        [userId]
    );
    return rows.map((r) => ({ ...r, account_balance: Number(r.account_balance), balance: Number(r.balance) }));
}

/** Cuenta principal = la primera registrada. */
export async function defaultAccountId(db: Queryable, userId: number) {
    const row = await getAsync<{ id: number }>(db, `SELECT id FROM bank_accounts WHERE user_id = ? AND deleted_at IS NULL ORDER BY id LIMIT 1`, [userId]);
    return row?.id ?? null;
}

export async function assertOwnedAccount(db: Queryable, userId: number, accountId: number) {
    const row = await getAsync<{ id: number }>(db, `SELECT id FROM bank_accounts WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, [accountId, userId]);
    if (!row) throw new HttpError(404, "No se encontró la cuenta.");
    return accountId;
}

/** undefined → cuenta principal · null → ninguna · número → se valida que sea del usuario. */
export async function resolveAccount(db: Queryable, userId: number, requested: number | null | undefined) {
    if (requested === null) return null;
    if (requested === undefined) return defaultAccountId(db, userId);
    return assertOwnedAccount(db, userId, requested);
}

async function balanceOf(db: Queryable, accountId: number) {
    const row = await getAsync<{ balance: number }>(
        db,
        `SELECT b.account_balance + COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = b.id), 0) AS balance FROM bank_accounts b WHERE b.id = ?`,
        [accountId]
    );
    return Number(row?.balance ?? 0);
}

export async function insertTransaction(
    db: Queryable,
    data: { userId: number; accountId: number; amount: number; date: string; description: string; kind: Kind } & Link
) {
    const after = (await balanceOf(db, data.accountId)) + data.amount;
    const result = await runAsync(
        db,
        `INSERT INTO transactions (user_id, account_id, description, amount, transaction_date, balance_after, kind,
                                   income_id, period_expense_id, savings_contribution_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.userId,
            data.accountId,
            data.description.slice(0, 255),
            data.amount,
            data.date,
            after,
            data.kind,
            data.income_id ?? null,
            data.period_expense_id ?? null,
            data.savings_contribution_id ?? null,
            nowISO(),
            nowISO(),
        ]
    );
    return result.lastID;
}

/** Deja el ingreso reflejado (o no) en la cuenta indicada. También mantiene bank_account_incomes. */
export async function syncIncomeLedger(db: Queryable, userId: number, income: { id: number; amount: number; date: string; description: string }, accountId: number | null) {
    await runAsync(db, `DELETE FROM transactions WHERE income_id = ?`, [income.id]);
    await runAsync(db, `DELETE FROM bank_account_incomes WHERE income_id = ?`, [income.id]);
    if (!accountId) return;
    await runAsync(db, `INSERT INTO bank_account_incomes (bank_account_id, income_id, created_at, updated_at) VALUES (?, ?, ?, ?)`, [
        accountId,
        income.id,
        nowISO(),
        nowISO(),
    ]);
    await insertTransaction(db, {
        userId,
        accountId,
        amount: Math.abs(income.amount),
        date: income.date,
        description: income.description || "Ingreso",
        kind: "income",
        income_id: income.id,
    });
}

export async function syncExpensePayment(
    db: Queryable,
    userId: number,
    payment: { periodExpenseId: number; paid: boolean; amount: number; date: string; description: string },
    accountId: number | null
) {
    await runAsync(db, `DELETE FROM transactions WHERE period_expense_id = ?`, [payment.periodExpenseId]);
    if (!payment.paid || !accountId) return;
    await insertTransaction(db, {
        userId,
        accountId,
        amount: -Math.abs(payment.amount),
        date: payment.date,
        description: payment.description,
        kind: "expense",
        period_expense_id: payment.periodExpenseId,
    });
}

export async function paymentAccountOf(db: Queryable, periodExpenseId: number) {
    const row = await getAsync<{ account_id: number }>(db, `SELECT account_id FROM transactions WHERE period_expense_id = ? LIMIT 1`, [periodExpenseId]);
    return row?.account_id ?? null;
}

export async function incomeAccountOf(db: Queryable, incomeId: number) {
    const row = await getAsync<{ bank_account_id: number }>(db, `SELECT bank_account_id FROM bank_account_incomes WHERE income_id = ? LIMIT 1`, [incomeId]);
    return row?.bank_account_id ?? null;
}

export async function listTransactions(userId: number, accountId: number, limit = 100) {
    await assertOwnedAccount(getDb(), userId, accountId);
    const rows = await allAsync<AccountTransaction>(
        getDb(),
        `SELECT id, account_id, amount, transaction_date, description, kind
         FROM transactions WHERE account_id = ? ORDER BY transaction_date DESC, id DESC LIMIT ?`,
        [accountId, limit]
    );
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function updateOpeningBalance(userId: number, accountId: number, opening: number) {
    await assertOwnedAccount(getDb(), userId, accountId);
    await runAsync(getDb(), `UPDATE bank_accounts SET account_balance = ?, updated_at = ? WHERE id = ?`, [opening, nowISO(), accountId]);
}

/** Ajuste manual (p. ej. intereses, retiro en efectivo) o transferencia entre cuentas propias. */
export async function createMovement(
    userId: number,
    data: { accountId: number; toAccountId?: number | null; amount: number; date: string; description: string }
) {
    return withTransaction(async (conn) => {
        await assertOwnedAccount(conn, userId, data.accountId);
        if (data.toAccountId) {
            if (data.toAccountId === data.accountId) throw new HttpError(400, "Elige dos cuentas diferentes.");
            await assertOwnedAccount(conn, userId, data.toAccountId);
            const amount = Math.abs(data.amount);
            await insertTransaction(conn, { userId, accountId: data.accountId, amount: -amount, date: data.date, description: data.description || "Transferencia enviada", kind: "transfer" });
            await insertTransaction(conn, { userId, accountId: data.toAccountId, amount, date: data.date, description: data.description || "Transferencia recibida", kind: "transfer" });
            return { ok: true };
        }
        await insertTransaction(conn, { userId, accountId: data.accountId, amount: data.amount, date: data.date, description: data.description || "Ajuste de saldo", kind: "adjustment" });
        return { ok: true };
    });
}

/** Solo se pueden borrar movimientos manuales; los demás se gestionan desde su origen. */
export async function deleteMovement(userId: number, transactionId: number) {
    const result = await runAsync(
        getDb(),
        `DELETE FROM transactions WHERE id = ? AND user_id = ? AND kind IN ('adjustment', 'transfer')`,
        [transactionId, userId]
    );
    if (result.changes === 0) throw new HttpError(404, "Solo puedes eliminar ajustes o transferencias manuales.");
}
