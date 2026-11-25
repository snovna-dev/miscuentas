import { getSessionUser, publicRoute } from "@/lib/http";

export default publicRoute({
    GET: async (req) => ({ user: await getSessionUser(req) }),
});
