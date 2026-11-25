import { createIncome, deleteIncome, listAllIncomes, listIncomesByUser, updateIncome } from "@/lib/db/queries/incomes";
import { apiRoute } from "@/lib/http";
import { asObject, reqId, reqInt } from "@/lib/validation";
import { parseIncome } from "@/lib/parsers";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

// Admin: puede actuar sobre cualquier registro (null). Usuario: solo sobre los suyos.
const scope = (user: { id: number; isAdmin: boolean }) => (user.isAdmin ? null : user.id);

export default apiRoute({
    GET: async (req, _res, user) => {
        if (user.isAdmin && req.query.scope === "all") return { incomes: await listAllIncomes() };

        const { year, month } = req.query;
        const filter = year && month ? { year: reqInt(year, "año", 2000, 2100), month: reqInt(month, "mes", 1, 12) } : undefined;
        return { incomes: await listIncomesByUser(user.id, filter) };
    },
    POST: async (req, _res, user) => {
        const body = asObject(req.body);
        const { id } = await createIncome(user.id, parseIncome(body.income));
        return { success: true, id };
    },
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        const id = reqId(body.id);
        await updateIncome(id, scope(user), parseIncome(body.income ?? body.Income));
        return { success: true, id };
    },
    DELETE: async (req, _res, user) => {
        const id = reqId(asObject(req.body).id);
        await deleteIncome(id, scope(user));
        return { success: true, id };
    },
});
