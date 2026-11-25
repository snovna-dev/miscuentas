import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS, createUser, deleteUser, listUsers } from "@/lib/db/queries/users";
import { apiRoute, HttpError } from "@/lib/http";
import { asObject, reqEmail, reqId, reqNewPassword, reqString } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

/**
 * Solo administradores. Antes cualquier usuario autenticado podía listar TODOS los
 * usuarios con sus hashes de contraseña, y "eliminar usuario" borraba un período.
 */
export default apiRoute(
    {
        GET: async () => ({ users: await listUsers() }),
        POST: async (req) => {
            const body = asObject(req.body);
            const name = reqString(body.name, "nombre", { min: 2, max: 80 });
            const email = reqEmail(body.email);
            const password = reqNewPassword(body.password);
            if (password !== body.passwordConfirm) throw new HttpError(400, "Las contraseñas no coinciden.");

            const { id } = await createUser({ name, email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) });
            return { success: true, id };
        },
        DELETE: async (req, _res, user) => {
            const id = reqId(asObject(req.body).id);
            if (id === user.id) throw new HttpError(400, "No puedes eliminar tu propia cuenta de administrador.");
            await deleteUser(id);
            return { success: true, id };
        },
    },
    { admin: true }
);
