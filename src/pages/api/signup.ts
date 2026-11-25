import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS, createUser, sendVerificationEmail } from "@/lib/db/queries/users";
import { createSession, setSessionCookie } from "@/lib/auth";
import { clientIp, HttpError, publicRoute } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { asObject, reqEmail, reqNewPassword, reqString } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default publicRoute({
    POST: async (req, res) => {
        rateLimit(`signup:ip:${clientIp(req)}`, 10, 60 * 60 * 1000);

        const body = asObject(req.body);
        const name = reqString(body.name, "nombre", { min: 2, max: 80 });
        const email = reqEmail(body.email);
        const password = reqNewPassword(body.password);
        if (password !== body.passwordConfirm) throw new HttpError(400, "Las contraseñas no coinciden.");

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const { id } = await createUser({ name, email, passwordHash });

        // Inicia sesión automáticamente y lleva al onboarding (antes había que volver a ingresar).
        const { token, expiresAt } = await createSession(id);
        setSessionCookie(res, token, expiresAt);

        // Correo de verificación (si falla el envío, la cuenta igual queda creada).
        await sendVerificationEmail(id).catch((error) => console.error("[signup] No se envió la verificación", error));

        return { success: true, redirectTo: "/user/onboarding" };
    },
});
