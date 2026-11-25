import {
    adminListPeriodExpenses,
    createExpenseWithPeriod,
    deletePeriodExpense,
    listPeriodExpensesByUserAndPeriod,
    updatePeriodExpense,
} from "@/lib/db/queries/period_expenses";
import { apiRoute, HttpError, requireAdmin } from "@/lib/http";
import { ownerScope, parseExpense } from "@/lib/parsers";
import { asObject, oneOf, optAccount, optString, reqAmount, reqDate, reqId, reqString } from "@/lib/validation";
import { ExpenseState } from "@/emuns/ExpenseState";
import type { ExpenseKind, PeriodExpensePatch } from "@/types";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

function parsePatch(value: unknown): PeriodExpensePatch {
    const data = asObject(value, "el gasto");
    const patch: PeriodExpensePatch = {};
    if (data.amount !== undefined) patch.amount = reqAmount(data.amount);
    if (data.expense_date !== undefined) patch.expense_date = reqDate(data.expense_date, "fecha del gasto").iso;
    if (data.expense_state_id !== undefined) {
        patch.expense_state_id = oneOf(data.expense_state_id, [ExpenseState.PENDING, ExpenseState.PAID] as const, "estado");
    }
    if (data.name !== undefined) patch.name = reqString(data.name, "nombre", { max: 120 });
    if (data.description !== undefined) patch.description = optString(data.description, "descripción", { max: 255 });
    if (data.expense_category_id !== undefined) patch.expense_category_id = reqId(data.expense_category_id, "categoría");
    const account = optAccount(data.bank_account_id);
    if (account !== undefined) patch.bank_account_id = account;
    if (Object.keys(patch).length === 0) throw new HttpError(400, "No hay cambios para guardar.");
    return patch;
}

export default apiRoute({
    GET: async (req, _res, user) => {
        const periodId = reqId(req.query.periodId, "período");
        // Consultar los gastos de OTRO usuario solo está permitido al administrador.
        if (req.query.userId) {
            requireAdmin(user);
            return { periodExpenses: await adminListPeriodExpenses(reqId(req.query.userId, "usuario"), periodId) };
        }
        return { periodExpenses: await listPeriodExpensesByUserAndPeriod(user.id, periodId) };
    },

    /**
     * Crea un gasto (fijo o variable) y lo registra en el mes de SU FECHA:
     * una fecha superior a hoy queda registrada en el mes de esa fecha.
     * El usuario y el período se resuelven en el servidor (se ignoran `id`/`periodId` del cliente).
     */
    POST: async (req, _res, user) => {
        const body = asObject(req.body);
        if (Array.isArray(body.expenses)) {
            throw new HttpError(410, "Los gastos fijos del mes ahora se generan automáticamente.");
        }
        const kind = oneOf<ExpenseKind>(body.kind ?? "variable", ["fixed", "variable"] as const, "tipo de gasto");
        const created = await createExpenseWithPeriod(user.id, parseExpense(body.expense), kind);
        return { success: true, ...created };
    },

    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        const id = reqId(body.id);
        const result = await updatePeriodExpense(id, ownerScope(user), parsePatch(body.periodExpense));
        return { success: true, ...result };
    },

    DELETE: async (req, _res, user) => {
        const id = reqId(asObject(req.body).id);
        await deletePeriodExpense(id, ownerScope(user));
        return { success: true, id };
    },
});
