import { completeTwoFactorLogin } from "@/lib/db/queries/users";
import { homePathFor, setSessionCookie } from "@/lib/auth";
import { clientIp, HttpError, publicRoute } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { asObject } from "@/lib/validation";
import { sha256 } from "@/lib/secrets";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default publicRoute({
    POST: async (req, res) => {
        const body = asObject(req.body);
        const challenge = typeof body.challenge === "string" ? body.challenge : "";
        const code = typeof body.code === "string" ? body.code : "";
        if (!challenge || !code) throw new HttpError(400, "Ingresa el código de verificación.");

        // 5 intentos por reto y 30 por IP cada 15 minutos.
        rateLimit(`2fa:challenge:${sha256(challenge)}`, 5, 15 * 60 * 1000);
        rateLimit(`2fa:ip:${clientIp(req)}`, 30, 15 * 60 * 1000);

        const { user, token, expiresAt } = await completeTwoFactorLogin(challenge, code);
        setSessionCookie(res, token, expiresAt);
        return { success: true, user, redirectTo: homePathFor(user) };
    },
});
