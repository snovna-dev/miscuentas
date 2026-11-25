import { getNotifications } from "@/lib/db/queries/notifications";
import { apiRoute } from "@/lib/http";

export default apiRoute({
    GET: async (_req, _res, user) => ({ notifications: await getNotifications(user.id) }),
});
