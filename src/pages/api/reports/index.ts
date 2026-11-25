import { getReport } from "@/lib/db/queries/reports";
import { apiRoute } from "@/lib/http";
import { serverCurrentMonth } from "@/lib/serverTime";
import { oneOf } from "@/lib/validation";

export default apiRoute({
    GET: async (req, _res, user) => {
        const months = oneOf(req.query.months ?? 6, [3, 6, 12] as const, "rango");
        return getReport(user.id, serverCurrentMonth(), months);
    },
});
