import { addContribution, deleteContribution, listContributions } from "@/lib/db/queries/savings";
import { apiRoute } from "@/lib/http";
import { asObject, optAccount, optString, reqDate, reqId, reqSignedAmount } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default apiRoute({
    GET: async (req, _res, user) => ({ contributions: await listContributions(user.id, reqId(req.query.goalId, "meta")) }),
    POST: async (req, _res, user) => {
        const body = asObject(req.body);
        const result = await addContribution(user.id, reqId(body.goalId, "meta"), {
            amount: reqSignedAmount(body.amount, "aporte"),
            date: reqDate(body.date, "fecha").iso,
            note: optString(body.note, "nota", { max: 255 }),
            bank_account_id: optAccount(body.bank_account_id),
        });
        return { success: true, ...result };
    },
    DELETE: async (req, _res, user) => {
        await deleteContribution(user.id, reqId(asObject(req.body).id));
        return { success: true };
    },
});
