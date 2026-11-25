import { allAsync, getAsync, getDb, nowISO, runAsync } from "../index";
import { HttpError } from "@/lib/http";
import type { Category } from "@/types";

export type CategoryInput = {
    name: string;
    category_type: number;
    description: string;
};

const COLUMNS = `id, name, category_type, description`;

export async function getAllCategories() {
    return allAsync<Category>(getDb(), `SELECT ${COLUMNS} FROM expense_categories ORDER BY category_type, name`);
}

export async function getCategoriesByType(type: number) {
    return allAsync<Category>(getDb(), `SELECT ${COLUMNS} FROM expense_categories WHERE category_type = ? ORDER BY name`, [type]);
}

export async function createCategory(input: CategoryInput) {
    const result = await runAsync(
        getDb(),
        `INSERT INTO expense_categories (name, category_type, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [input.name, input.category_type, input.description, nowISO(), nowISO()]
    );
    return { id: result.lastID };
}

export async function updateCategory(id: number, input: CategoryInput) {
    const result = await runAsync(
        getDb(),
        `UPDATE expense_categories SET name = ?, category_type = ?, description = ?, updated_at = ? WHERE id = ?`,
        [input.name, input.category_type, input.description, nowISO(), id]
    );
    if (result.changes === 0) throw new HttpError(404, "No se encontró la categoría.");
    return { id };
}

/** El FK tiene ON DELETE CASCADE: borrar una categoría en uso eliminaba gastos de TODOS los usuarios. */
export async function deleteCategory(id: number) {
    const usage = await getAsync<{ total: number }>(getDb(), `SELECT COUNT(*) AS total FROM expenses WHERE expense_category_id = ?`, [id]);
    if (Number(usage?.total ?? 0) > 0) {
        throw new HttpError(409, "La categoría tiene gastos asociados y no se puede eliminar.");
    }

    const result = await runAsync(getDb(), `DELETE FROM expense_categories WHERE id = ?`, [id]);
    if (result.changes === 0) throw new HttpError(404, "No se encontró la categoría.");
    return { id };
}
