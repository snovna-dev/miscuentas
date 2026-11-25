import { login } from "@/lib/db/queries/users";
import { homePathFor, setSessionCookie } from "@/lib/auth";
import { clientIp, HttpError, publicRoute } from "@/lib/http";
import { rateLimit, resetRateLimit } from "@/lib/rateLimit";
import { asObject, reqEmail } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

const WINDOW = 15 * 60 * 1000;

export default publicRoute({
    POST: async (req, res) => {
        const body = asObject(req.body);
        const email = reqEmail(body.email);
        const password = typeof body.password === "string" ? body.password : "";
        if (!password) throw new HttpError(400, "Ingresa tu contraseña.");

        // Fuerza bruta: por IP y por cuenta.
        rateLimit(`login:ip:${clientIp(req)}`, 30, WINDOW);
        rateLimit(`login:acct:${email}`, 8, WINDOW);

        const result = await login({ email, password });
        resetRateLimit(`login:acct:${email}`);

        // Con verificación en dos pasos, la sesión se crea en /api/login/2fa.
        if (result.twoFactor) return { success: true, twoFactor: true, challenge: result.challenge };

        setSessionCookie(res, result.token, result.expiresAt);
        // El token nunca se devuelve en el cuerpo (solo viaja en la cookie httpOnly).
        return { success: true, user: result.user, redirectTo: homePathFor(result.user) };
    },
});
