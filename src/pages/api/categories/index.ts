import { createCategory, deleteCategory, getAllCategories, getCategoriesByType, updateCategory, type CategoryInput } from "@/lib/db/queries/categories";
import { apiRoute, requireAdmin } from "@/lib/http";
import { asObject, oneOf, optString, reqId, reqString } from "@/lib/validation";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

const TYPES = [ExpenseCategoryType.FIXED, ExpenseCategoryType.VARIABLE, ExpenseCategoryType.SAVINGS] as const;

function parseCategory(value: unknown): CategoryInput {
    const category = asObject(value, "la categoría");
    return {
        name: reqString(category.name_category ?? category.name, "nombre", { max: 80 }),
        category_type: oneOf(category.category_type, TYPES, "tipo de categoría"),
        description: optString(category.description, "descripción", { max: 255 }),
    };
}

// Las categorías son globales: cualquiera las consulta, solo el administrador las modifica.
export default apiRoute({
    GET: async (req) => {
        const { type } = req.query;
        const categories = type ? await getCategoriesByType(oneOf(type, TYPES, "tipo")) : await getAllCategories();
        return { categories };
    },
    POST: async (req, _res, user) => {
        requireAdmin(user);
        const { id } = await createCategory(parseCategory(asObject(req.body).category));
        return { success: true, id };
    },
    PUT: async (req, _res, user) => {
        requireAdmin(user);
        const body = asObject(req.body);
        const id = reqId(body.id);
        await updateCategory(id, parseCategory(body.category));
        return { success: true, id };
    },
    DELETE: async (req, _res, user) => {
        requireAdmin(user);
        const id = reqId(asObject(req.body).id);
        await deleteCategory(id);
        return { success: true, id };
    },
});
