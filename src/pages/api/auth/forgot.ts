import { requestPasswordReset } from "@/lib/db/queries/users";
import { clientIp, publicRoute } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { asObject, reqEmail } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default publicRoute({
    POST: async (req) => {
        rateLimit(`forgot:ip:${clientIp(req)}`, 10, 60 * 60 * 1000);
        const email = reqEmail(asObject(req.body).email);
        rateLimit(`forgot:acct:${email}`, 3, 60 * 60 * 1000);
        await requestPasswordReset(email);
        // Respuesta idéntica exista o no la cuenta (no revela qué correos están registrados).
        return { success: true, message: "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña." };
    },
});
