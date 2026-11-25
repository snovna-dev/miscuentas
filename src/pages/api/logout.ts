import { clearSessionCookie, deleteSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { publicRoute } from "@/lib/http";

export default publicRoute({
    POST: async (req, res) => {
        const token = req.cookies?.[SESSION_COOKIE_NAME];
        if (token) await deleteSessionByToken(token);
        clearSessionCookie(res);
        return { ok: true };
    },
});
