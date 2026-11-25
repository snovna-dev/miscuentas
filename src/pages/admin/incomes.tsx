import * as React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTable, useCollection } from "@/components/admin/AdminTable";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateLong } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import type { Income, IncomeInput } from "@/types";

export const getServerSideProps = withPageAuth("admin");

export default function AdminIncomes() {
    const toast = useToast();
    const [editing, setEditing] = React.useState<Income | null>(null);
    const [deleting, setDeleting] = React.useState<Income | null>(null);
    const { rows, loading, reload } = useCollection(
        async () => (await api<{ incomes: Income[] }>("/api/incomes?scope=all")).incomes,
        (message) => toast.error("Error al cargar ingresos", message)
    );

    async function update(values: IncomeInput) {
        if (!editing) return;
        // El admin edita ingresos ajenos: no se envía la cuenta (sus cuentas no son las del usuario).
        const { amount, income_date, description } = values;
        await api("/api/incomes", { method: "PUT", body: { id: editing.id, income: { amount, income_date, description } } });
        toast.success("Ingreso actualizado");
        setEditing(null);
        await reload();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/incomes", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Ingreso eliminado");
            setDeleting(null);
            await reload();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    const total = rows.reduce((acc, r) => acc + Number(r.amount), 0);

    return (
        <AdminLayout title="Ingresos" description={`Ingresos de todos los usuarios · Total ${formatMoney(total)}`}>
            <AdminTable
                title="Ingresos"
                rows={rows}
                loading={loading}
                rowKey={(r) => r.id}
                onEdit={setEditing}
                onDelete={setDeleting}
                columns={[
                    { header: "Usuario", cell: (r) => <span className="font-medium">{r.user_name}</span>, search: (r) => r.user_name ?? "" },
                    { header: "Fecha", cell: (r) => formatDateLong(r.income_date) },
                    { header: "Valor", cell: (r) => <span className="font-medium tabular">{formatMoney(r.amount)}</span>, className: "text-right" },
                    { header: "Descripción", cell: (r) => <span className="text-muted-foreground">{r.description || "—"}</span>, search: (r) => r.description ?? "" },
                ]}
            />
            <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar ingreso" description={editing?.user_name}>
                {editing && <IncomeForm key={editing.id} initial={{ ...editing, amount: Number(editing.amount), description: editing.description ?? "" }} onSubmit={update} onCancel={() => setEditing(null)} idPrefix="admin-income" showAccount={false} />}
            </Dialog>
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar ingreso?"
                description={deleting ? `${formatMoney(deleting.amount)} de ${deleting.user_name}.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AdminLayout>
    );
}
