import { getDashboard } from "@/lib/db/queries/dashboard";
import { apiRoute } from "@/lib/http";
import { serverCurrentMonth } from "@/lib/serverTime";
import { reqInt } from "@/lib/validation";

export default apiRoute({
    GET: async (req, _res, user) => {
        const current = serverCurrentMonth();
        const year = req.query.year ? reqInt(req.query.year, "año", 2000, 2100) : current.year;
        const month = req.query.month ? reqInt(req.query.month, "mes", 1, 12) : current.month;
        return getDashboard(user.id, { year, month });
    },
});
