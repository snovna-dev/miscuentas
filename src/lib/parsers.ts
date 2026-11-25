import { HttpError } from "@/lib/http";
import { FREQUENCY_VALUES } from "@/lib/schedule";
import { asObject, oneOf, optAccount, optString, reqAmount, reqDate, reqId, reqInt, reqString } from "@/lib/validation";
import type { ExpenseInput, IncomeInput } from "@/types";

/** Valida el cuerpo de un gasto (compartido por /api/expenses y /api/periodExpenses). */
export function parseExpense(value: unknown): ExpenseInput {
    const expense = asObject(value, "el gasto");
    const parsed: ExpenseInput = {
        expense_category_id: reqId(expense.expense_category_id, "categoría"),
        name: reqString(expense.name, "nombre", { max: 120 }),
        description: optString(expense.description, "descripción", { max: 255 }),
        expense_date: reqDate(expense.expense_date, "fecha del gasto").iso,
        amount: reqAmount(expense.amount),
    };
    if (expense.frequency_months !== undefined) {
        parsed.frequency_months = oneOf(expense.frequency_months, FREQUENCY_VALUES as unknown as readonly number[], "frecuencia");
    }
    if (expense.installments !== undefined) {
        parsed.installments = expense.installments === null || expense.installments === "" ? null : reqInt(expense.installments, "número de cuotas", 1, 600);
    }
    return parsed;
}

export function parseIncome(value: unknown): IncomeInput {
    const income = asObject(value, "el ingreso");
    const parsed: IncomeInput = {
        amount: reqAmount(income.amount),
        income_date: reqDate(income.income_date, "fecha del ingreso").iso,
        description: optString(income.description, "descripción", { max: 255 }),
    };
    const account = optAccount(income.bank_account_id);
    if (account !== undefined) parsed.bank_account_id = account;
    return parsed;
}

export function requireTrue(condition: unknown, message: string) {
    if (!condition) throw new HttpError(400, message);
}

export const ownerScope = (user: { id: number; isAdmin: boolean }) => (user.isAdmin ? null : user.id);
