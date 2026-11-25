import { confirmTwoFactor, disableTwoFactor, startTwoFactorSetup } from "@/lib/db/queries/users";
import { apiRoute } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { asObject } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default apiRoute({
    /** Inicia la configuración: devuelve el QR y el secreto para la app autenticadora. */
    POST: async (_req, _res, user) => {
        rateLimit(`2fa-setup:${user.id}`, 10, 15 * 60 * 1000);
        return startTwoFactorSetup(user.id);
    },
    /** Confirma con el primer código y devuelve los códigos de recuperación (una sola vez). */
    PUT: async (req, _res, user) => {
        rateLimit(`2fa-confirm:${user.id}`, 10, 15 * 60 * 1000);
        return confirmTwoFactor(user.id, String(asObject(req.body).code ?? ""));
    },
    /** Desactiva la verificación en dos pasos (requiere contraseña y código). */
    DELETE: async (req, _res, user) => {
        rateLimit(`2fa-disable:${user.id}`, 10, 15 * 60 * 1000);
        const body = asObject(req.body);
        await disableTwoFactor(user.id, String(body.password ?? ""), String(body.code ?? ""));
        return { success: true };
    },
});
