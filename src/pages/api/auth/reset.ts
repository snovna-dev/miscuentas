import { isResetTokenValid, resetPassword } from "@/lib/db/queries/users";
import { clientIp, HttpError, publicRoute } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { asObject, reqNewPassword } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default publicRoute({
    GET: async (req) => ({ valid: typeof req.query.token === "string" && (await isResetTokenValid(req.query.token)) }),
    POST: async (req) => {
        rateLimit(`reset:ip:${clientIp(req)}`, 20, 60 * 60 * 1000);
        const body = asObject(req.body);
        const token = typeof body.token === "string" ? body.token : "";
        const password = reqNewPassword(body.password);
        if (password !== body.passwordConfirm) throw new HttpError(400, "Las contraseñas no coinciden.");
        await resetPassword(token, password);
        return { success: true };
    },
});
