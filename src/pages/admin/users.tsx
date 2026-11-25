import * as React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTable, useCollection } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/contexts/UserContext";
import { api, errorMessage } from "@/lib/client/api";
import { formatNumericDate } from "@/components/admin/format";
import { withPageAuth } from "@/lib/ssr";
import type { AdminUser } from "@/types";

export const getServerSideProps = withPageAuth("admin");

export default function AdminUsers() {
    const toast = useToast();
    const { user } = useUser();
    const [deleting, setDeleting] = React.useState<AdminUser | null>(null);
    const { rows, loading, reload } = useCollection(
        async () => (await api<{ users: AdminUser[] }>("/api/users")).users,
        (message) => toast.error("Error al cargar usuarios", message)
    );

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/users", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Usuario eliminado", deleting.email);
            setDeleting(null);
            await reload();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    return (
        <AdminLayout title="Usuarios" description="Cuentas registradas. Las contraseñas nunca se exponen.">
            <AdminTable
                title="Usuarios"
                rows={rows}
                loading={loading}
                rowKey={(r) => r.id}
                onDelete={(row) => (row.id === user?.id ? toast.info("No puedes eliminar tu propia cuenta") : setDeleting(row))}
                columns={[
                    { header: "Nombre", cell: (r) => <span className="font-medium">{r.name}</span>, search: (r) => r.name },
                    { header: "Correo", cell: (r) => r.email, search: (r) => r.email },
                    { header: "Rol", cell: (r) => (Number(r.sw_admin) === 1 ? <Badge tone="brand">Administrador</Badge> : <Badge>Usuario</Badge>) },
                    {
                        header: "Onboarding",
                        cell: (r) => (r.onboarding_completed_at ? <Badge tone="success">Completo</Badge> : <Badge tone="warning">Pendiente</Badge>),
                    },
                    { header: "Registro", cell: (r) => formatNumericDate(r.created_at) },
                ]}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar usuario?"
                description={deleting ? `Se eliminará ${deleting.email} junto con TODOS sus ingresos, gastos y sesiones.` : undefined}
                confirmLabel="Eliminar usuario"
                onConfirm={remove}
            />
        </AdminLayout>
    );
}
