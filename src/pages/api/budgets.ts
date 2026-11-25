import { deleteBudget, listBudgetStatus, upsertBudget } from "@/lib/db/queries/budgets";
import { apiRoute } from "@/lib/http";
import { serverCurrentMonth } from "@/lib/serverTime";
import { asObject, reqAmount, reqId, reqInt } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default apiRoute({
    GET: async (req, _res, user) => {
        const current = serverCurrentMonth();
        const year = req.query.year ? reqInt(req.query.year, "año", 2000, 2100) : current.year;
        const month = req.query.month ? reqInt(req.query.month, "mes", 1, 12) : current.month;
        return { budgets: await listBudgetStatus(user.id, { year, month }) };
    },
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        await upsertBudget(user.id, reqId(body.category_id, "categoría"), reqAmount(body.amount, "presupuesto"));
        return { success: true };
    },
    DELETE: async (req, _res, user) => {
        await deleteBudget(user.id, reqId(asObject(req.body).category_id, "categoría"));
        return { success: true };
    },
});
