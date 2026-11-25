import { changeEmail, changePassword, getProfile, logoutOtherSessions, updateProfile } from "@/lib/db/queries/users";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { apiRoute, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { asObject, oneOf, reqEmail, reqInt, reqNewPassword, reqString } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default apiRoute({
    GET: async (_req, _res, user) => ({ profile: await getProfile(user.id) }),

    /** Datos básicos y preferencias de recordatorios. */
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        await updateProfile(user.id, {
            name: reqString(body.name, "nombre", { min: 2, max: 80 }),
            notify_email: Boolean(body.notify_email),
            reminder_days: reqInt(body.reminder_days ?? 2, "días de anticipación", 1, 15),
        });
        return { success: true, profile: await getProfile(user.id) };
    },

    /** Seguridad: cambiar contraseña, cambiar correo o cerrar las demás sesiones. */
    POST: async (req, _res, user) => {
        const body = asObject(req.body);
        const action = oneOf(body.action, ["password", "email", "logout-others"] as const, "acción");
        const token = req.cookies[SESSION_COOKIE_NAME] ?? "";
        rateLimit(`profile:${action}:${user.id}`, 10, 15 * 60 * 1000);

        if (action === "password") {
            const next = reqNewPassword(body.newPassword);
            if (next !== body.newPasswordConfirm) throw new HttpError(400, "Las contraseñas no coinciden.");
            await changePassword(user.id, String(body.currentPassword ?? ""), next, token);
            return { success: true };
        }
        if (action === "email") {
            await changeEmail(user.id, reqEmail(body.email), String(body.password ?? ""));
            return { success: true, profile: await getProfile(user.id) };
        }
        await logoutOtherSessions(user.id, token);
        return { success: true };
    },
});
