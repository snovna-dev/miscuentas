import * as React from "react";
import { Plus, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTable, useCollection } from "@/components/admin/AdminTable";
import { Button } from "@/components/buttons";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/category-select";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { invalidateCategories } from "@/hooks/useCategories";
import { api, errorMessage } from "@/lib/client/api";
import { withPageAuth } from "@/lib/ssr";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import type { Category } from "@/types";

export const getServerSideProps = withPageAuth("admin");

const TYPE_LABEL: Record<number, string> = { 1: "Fijo", 2: "Variable", 3: "Ahorro" };

function CategoryForm({ initial, onSubmit, onCancel }: { initial?: Category | null; onSubmit: (v: { name_category: string; category_type: number; description: string }) => Promise<void>; onCancel?: () => void }) {
    const [name, setName] = React.useState(initial?.name ?? "");
    const [type, setType] = React.useState(initial ? String(initial.category_type) : String(ExpenseCategoryType.VARIABLE));
    const [description, setDescription] = React.useState(initial?.description ?? "");
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (name.trim().length < 2) return setError("Escribe un nombre válido.");
        setBusy(true);
        setError(null);
        try {
            await onSubmit({ name_category: name.trim(), category_type: Number(type), description: description.trim() });
            if (!initial) {
                setName("");
                setDescription("");
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="Nombre" htmlFor="cat-name" required>
                <Input id="cat-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ej: Gimnasio" />
            </Field>
            <Field label="Tipo" htmlFor="cat-type" required>
                <SelectField
                    id="cat-type"
                    value={type}
                    onValueChange={setType}
                    options={[
                        { value: "1", label: "Fijo", description: "Se repite cada mes" },
                        { value: "2", label: "Variable", description: "Gastos ocasionales" },
                        { value: "3", label: "Ahorro", description: "Metas de ahorro" },
                    ]}
                />
            </Field>
            <Field label="Descripción" htmlFor="cat-desc" optional className="sm:col-span-2">
                <Input id="cat-desc" value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} placeholder="Ejemplos de gastos de esta categoría" />
            </Field>
            <div className="sm:col-span-2">
                <FormError message={error} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" loading={busy}>
                    {initial ? <Save /> : <Plus />} {initial ? "Guardar" : "Crear categoría"}
                </Button>
            </div>
        </form>
    );
}

export default function AdminCategories() {
    const toast = useToast();
    const [editing, setEditing] = React.useState<Category | null>(null);
    const [deleting, setDeleting] = React.useState<Category | null>(null);
    const { rows, loading, reload } = useCollection(
        async () => (await api<{ categories: Category[] }>("/api/categories")).categories,
        (message) => toast.error("Error al cargar categorías", message)
    );

    async function create(values: { name_category: string; category_type: number; description: string }) {
        await api("/api/categories", { method: "POST", body: { category: values } });
        invalidateCategories();
        toast.success("Categoría creada", values.name_category);
        await reload();
    }

    async function update(values: { name_category: string; category_type: number; description: string }) {
        if (!editing) return;
        await api("/api/categories", { method: "PUT", body: { id: editing.id, category: values } });
        invalidateCategories();
        toast.success("Categoría actualizada");
        setEditing(null);
        await reload();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/categories", { method: "DELETE", body: { id: deleting.id } });
            invalidateCategories();
            toast.success("Categoría eliminada");
            setDeleting(null);
            await reload();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    return (
        <AdminLayout title="Categorías" description="Las categorías son compartidas por todos los usuarios. Una categoría con gastos no se puede eliminar.">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <CategoryForm onSubmit={create} />
            </div>
            <AdminTable
                title="Categorías"
                rows={rows}
                loading={loading}
                rowKey={(r) => r.id}
                onEdit={setEditing}
                onDelete={setDeleting}
                columns={[
                    {
                        header: "Nombre",
                        cell: (r) => (
                            <span className="flex items-center gap-2.5 font-medium">
                                <CategoryIcon name={r.name} size="sm" /> {r.name}
                            </span>
                        ),
                        search: (r) => r.name,
                    },
                    { header: "Tipo", cell: (r) => <Badge tone={Number(r.category_type) === 1 ? "brand" : Number(r.category_type) === 2 ? "info" : "success"}>{TYPE_LABEL[Number(r.category_type)]}</Badge> },
                    { header: "Descripción", cell: (r) => <span className="text-muted-foreground">{r.description || "—"}</span>, search: (r) => r.description ?? "" },
                ]}
            />
            <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar categoría">
                {editing && <CategoryForm key={editing.id} initial={editing} onSubmit={update} onCancel={() => setEditing(null)} />}
            </Dialog>
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar categoría?"
                description={deleting ? `"${deleting.name}" se eliminará solo si no tiene gastos asociados.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AdminLayout>
    );
}
