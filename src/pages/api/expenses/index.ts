import { createExpense, deleteExpense, listAllExpenses, listExpensesByUser, listFixedExpensesByUser, updateExpense } from "@/lib/db/queries/expenses";
import { apiRoute } from "@/lib/http";
import { ownerScope, parseExpense } from "@/lib/parsers";
import { asObject, reqId } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default apiRoute({
    GET: async (req, _res, user) => {
        const { type } = req.query;
        if (type === "fixed" || type === "dashboard") return { expenses: await listFixedExpensesByUser(user.id) };
        if (user.isAdmin && type !== "mine") return { expenses: await listAllExpenses() };
        return { expenses: await listExpensesByUser(user.id) };
    },
    POST: async (req, _res, user) => {
        const body = asObject(req.body);
        const { id } = await createExpense(user.id, parseExpense(body.expense));
        return { success: true, id };
    },
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        const id = reqId(body.id);
        const result = await updateExpense(id, ownerScope(user), parseExpense(body.expense ?? body.Expense));
        return { success: true, ...result };
    },
    DELETE: async (req, _res, user) => {
        const id = reqId(asObject(req.body).id);
        const result = await deleteExpense(id, ownerScope(user));
        return { success: true, ...result };
    },
});
