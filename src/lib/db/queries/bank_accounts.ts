import crypto from "crypto";
import { allAsync, getDb, nowISO, runAsync } from "../index";
import { HttpError } from "@/lib/http";
import type { BankAccount, BankAccountInput } from "@/types";

const COLUMNS = `b.id, b.user_id, b.account_number, b.account_type, b.bank_name, b.account_balance, b.created_at, b.updated_at`;

/**
 * El número de cuenta es opcional: si no se envía se genera una referencia aleatoria
 * en el servidor (antes se calculaba en el navegador con un hash del nombre del banco).
 * Nunca se piden números completos de cuenta.
 */
function accountReference(input: BankAccountInput) {
    const last4 = (input.account_number ?? "").replace(/\D/g, "").slice(-4);
    return `${last4 ? `****${last4}` : "ref"}-${crypto.randomUUID()}`;
}

export async function createBankAccount(userId: number, input: BankAccountInput) {
    const result = await runAsync(
        getDb(),
        `INSERT INTO bank_accounts (user_id, account_number, account_type, bank_name, account_balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, accountReference(input), input.account_type, input.bank_name, input.opening_balance ?? 0, nowISO(), nowISO()]
    );
    return { id: result.lastID };
}

export async function listBankAccountsByUser(userId: number) {
    return allAsync<BankAccount>(
        getDb(),
        `SELECT ${COLUMNS} FROM bank_accounts b WHERE b.user_id = ? AND b.deleted_at IS NULL ORDER BY b.id`,
        [userId]
    );
}

export async function listAllBankAccounts() {
    return allAsync<BankAccount>(
        getDb(),
        `SELECT ${COLUMNS}, u.name AS user_name FROM bank_accounts b INNER JOIN users u ON u.id = b.user_id
         WHERE b.deleted_at IS NULL ORDER BY b.id DESC LIMIT 1000`
    );
}

export async function updateBankAccount(id: number, userId: number | null, input: BankAccountInput) {
    const result = await runAsync(
        getDb(),
        `UPDATE bank_accounts SET account_type = ?, bank_name = ?, account_balance = COALESCE(?, account_balance), updated_at = ?
         WHERE id = ? ${userId === null ? "" : "AND user_id = ?"}`,
        [input.account_type, input.bank_name, input.opening_balance ?? null, nowISO(), id, ...(userId === null ? [] : [userId])]
    );
    if (result.changes === 0) throw new HttpError(404, "No se encontró la cuenta.");
    return { id };
}

export async function deleteBankAccount(id: number, userId: number | null) {
    const result = await runAsync(
        getDb(),
        `DELETE FROM bank_accounts WHERE id = ? ${userId === null ? "" : "AND user_id = ?"}`,
        userId === null ? [id] : [id, userId]
    );
    if (result.changes === 0) throw new HttpError(404, "No se encontró la cuenta.");
    return { id };
}
