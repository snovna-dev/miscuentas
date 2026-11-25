import { sendVerificationEmail, verifyEmail } from "@/lib/db/queries/users";
import { clientIp, getSessionUser, HttpError, publicRoute } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { asObject } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default publicRoute({
    /** Confirma el correo con el token del enlace, o reenvía el correo ({ resend: true }). */
    POST: async (req) => {
        rateLimit(`verify:ip:${clientIp(req)}`, 30, 60 * 60 * 1000);
        const body = asObject(req.body);
        if (body.resend) {
            const user = await getSessionUser(req);
            if (!user) throw new HttpError(401, "Inicia sesión para reenviar el correo.");
            rateLimit(`verify:resend:${user.id}`, 3, 60 * 60 * 1000);
            return sendVerificationEmail(user.id);
        }
        const token = typeof body.token === "string" ? body.token : "";
        return verifyEmail(token);
    },
});
