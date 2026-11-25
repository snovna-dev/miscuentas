import { createGoal, deleteGoal, listGoals, updateGoal } from "@/lib/db/queries/savings";
import { apiRoute } from "@/lib/http";
import { asObject, oneOf, optDate, reqAmount, reqId, reqString } from "@/lib/validation";
import type { SavingsGoalInput } from "@/types";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

const GOAL_COLORS = ["emerald", "sky", "violet", "amber", "rose", "teal"] as const;

function parse(value: unknown): SavingsGoalInput {
    const data = asObject(value, "la meta");
    return {
        name: reqString(data.name, "nombre", { max: 120 }),
        target_amount: reqAmount(data.target_amount, "valor de la meta"),
        target_date: optDate(data.target_date, "fecha objetivo"),
        color: oneOf(data.color ?? "emerald", GOAL_COLORS, "color"),
    };
}

export default apiRoute({
    GET: async (_req, _res, user) => ({ goals: await listGoals(user.id) }),
    POST: async (req, _res, user) => ({ success: true, ...(await createGoal(user.id, parse(asObject(req.body).goal))) }),
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        await updateGoal(user.id, reqId(body.id), parse(body.goal));
        return { success: true };
    },
    DELETE: async (req, _res, user) => {
        await deleteGoal(user.id, reqId(asObject(req.body).id));
        return { success: true };
    },
});
