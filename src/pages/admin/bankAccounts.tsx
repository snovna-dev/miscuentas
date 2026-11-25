import * as React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTable, useCollection } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatNumericDate } from "@/components/admin/format";
import { api, errorMessage } from "@/lib/client/api";
import { withPageAuth } from "@/lib/ssr";
import type { BankAccount } from "@/types";

export const getServerSideProps = withPageAuth("admin");

/** Muestra solo los últimos dígitos (si existen) de la referencia guardada. */
function maskAccount(reference: string) {
    const match = /^\*{4}(\d{4})-/.exec(reference);
    return match ? `•••• ${match[1]}` : "—";
}

export default function AdminBankAccounts() {
    const toast = useToast();
    const [deleting, setDeleting] = React.useState<BankAccount | null>(null);
    const { rows, loading, reload } = useCollection(
        async () => (await api<{ bankAccounts: BankAccount[] }>("/api/bankAccount?scope=all")).bankAccounts,
        (message) => toast.error("Error al cargar cuentas", message)
    );

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/bankAccount", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Cuenta eliminada");
            setDeleting(null);
            await reload();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    return (
        <AdminLayout title="Cuentas bancarias" description="Cuentas registradas por los usuarios. No se almacenan números completos.">
            <AdminTable
                title="Cuentas"
                rows={rows}
                loading={loading}
                rowKey={(r) => r.id}
                onDelete={setDeleting}
                columns={[
                    { header: "Banco", cell: (r) => <span className="font-medium">{r.bank_name}</span>, search: (r) => r.bank_name },
                    { header: "Usuario", cell: (r) => r.user_name, search: (r) => r.user_name ?? "" },
                    { header: "Tipo", cell: (r) => <Badge>{Number(r.account_type) === 1 ? "Ahorros" : "Corriente"}</Badge> },
                    { header: "Cuenta", cell: (r) => <span className="tabular text-muted-foreground">{maskAccount(r.account_number)}</span> },
                    { header: "Creada", cell: (r) => formatNumericDate(r.created_at) },
                ]}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar cuenta?"
                description={deleting ? `${deleting.bank_name} de ${deleting.user_name}.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AdminLayout>
    );
}
