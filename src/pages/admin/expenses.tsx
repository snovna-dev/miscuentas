import * as React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTable, useCollection } from "@/components/admin/AdminTable";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateShort } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import type { Expense, ExpenseInput } from "@/types";

export const getServerSideProps = withPageAuth("admin");

export default function AdminExpenses() {
    const toast = useToast();
    const [editing, setEditing] = React.useState<Expense | null>(null);
    const [deleting, setDeleting] = React.useState<Expense | null>(null);
    const { rows, loading, reload } = useCollection(
        async () => (await api<{ expenses: Expense[] }>("/api/expenses")).expenses,
        (message) => toast.error("Error al cargar gastos", message)
    );

    async function update(values: ExpenseInput) {
        if (!editing) return;
        await api("/api/expenses", { method: "PUT", body: { id: editing.id, expense: values } });
        toast.success("Gasto actualizado");
        setEditing(null);
        await reload();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/expenses", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Gasto eliminado", "Se conservó el historial de pagos.");
            setDeleting(null);
            await reload();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    return (
        <AdminLayout title="Gastos" description="Definiciones de gastos de todos los usuarios. Los fijos se repiten cada mes.">
            <AdminTable
                title="Gastos"
                rows={rows}
                loading={loading}
                rowKey={(r) => r.id}
                onEdit={(row) =>
                    Number(row.category_type) === ExpenseCategoryType.FIXED
                        ? setEditing(row)
                        : toast.info("Los gastos variables se editan desde «Gastos por mes»", "Así se mantiene sincronizado el registro del mes.")
                }
                onDelete={setDeleting}
                columns={[
                    {
                        header: "Gasto",
                        cell: (r) => (
                            <span className="flex items-center gap-2.5">
                                <CategoryIcon name={r.category_name} size="sm" />
                                <span>
                                    <span className="block font-medium">{r.name}</span>
                                    <span className="block text-xs text-muted-foreground">{r.category_name}</span>
                                </span>
                            </span>
                        ),
                        search: (r) => `${r.name} ${r.category_name}`,
                    },
                    { header: "Usuario", cell: (r) => r.user_name, search: (r) => r.user_name ?? "" },
                    { header: "Tipo", cell: (r) => (Number(r.category_type) === ExpenseCategoryType.FIXED ? <Badge tone="brand">Fijo</Badge> : <Badge tone="info">Variable</Badge>) },
                    { header: "Fecha", cell: (r) => formatDateShort(r.expense_date) },
                    { header: "Valor", cell: (r) => <span className="font-medium tabular">{formatMoney(r.amount)}</span>, className: "text-right" },
                ]}
            />
            <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar gasto" description={editing?.user_name}>
                {editing && (
                    <ExpenseForm
                        key={editing.id}
                        kind="fixed"
                        initial={{ ...editing, amount: Number(editing.amount), description: editing.description ?? "" }}
                        onSubmit={update}
                        onCancel={() => setEditing(null)}
                        idPrefix="admin-expense"
                    />
                )}
            </Dialog>
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar gasto?"
                description={deleting ? `"${deleting.name}" de ${deleting.user_name}. Se quitarán sus pendientes desde este mes; el historial se conserva.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AdminLayout>
    );
}
