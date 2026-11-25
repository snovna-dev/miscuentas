import { createRecurringIncome, listRecurringIncomes, stopRecurringIncome, updateRecurringIncome } from "@/lib/db/queries/incomes";
import { apiRoute } from "@/lib/http";
import { asObject, optAccount, reqAmount, reqDate, reqId, reqString } from "@/lib/validation";
import type { RecurringIncomeInput } from "@/types";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

function parse(value: unknown): RecurringIncomeInput {
    const data = asObject(value, "el ingreso recurrente");
    return {
        description: reqString(data.description, "descripción", { max: 255 }),
        amount: reqAmount(data.amount),
        start_date: reqDate(data.start_date, "fecha de inicio").iso,
        bank_account_id: optAccount(data.bank_account_id),
    };
}

export default apiRoute({
    GET: async (_req, _res, user) => ({ recurringIncomes: await listRecurringIncomes(user.id) }),
    POST: async (req, _res, user) => ({ success: true, ...(await createRecurringIncome(user.id, parse(asObject(req.body).recurringIncome))) }),
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        return { success: true, ...(await updateRecurringIncome(user.id, reqId(body.id), parse(body.recurringIncome))) };
    },
    DELETE: async (req, _res, user) => ({ success: true, ...(await stopRecurringIncome(user.id, reqId(asObject(req.body).id))) }),
});
