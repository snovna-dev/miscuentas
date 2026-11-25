import * as React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/category-select";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { PeriodExpenseForm } from "@/components/forms/PeriodExpenseForm";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { MonthSwitcher } from "@/components/finance/MonthSwitcher";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateShort, type YearMonth } from "@/lib/dates";
import { useCurrentMonth } from "@/contexts/TodayContext";
import { formatMoney } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { ExpenseState } from "@/emuns/ExpenseState";
import type { AdminUser, Period, PeriodExpense, PeriodExpensePatch } from "@/types";
import { Users } from "lucide-react";

export const getServerSideProps = withPageAuth("admin");

export default function AdminPeriodExpenses() {
    const toast = useToast();
    const today = useCurrentMonth();
    const [ym, setYm] = React.useState<YearMonth>(today);
    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [userId, setUserId] = React.useState("");
    const [rows, setRows] = React.useState<PeriodExpense[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [editing, setEditing] = React.useState<PeriodExpense | null>(null);
    const [deleting, setDeleting] = React.useState<PeriodExpense | null>(null);

    React.useEffect(() => {
        api<{ users: AdminUser[] }>("/api/users")
            .then((data) => setUsers(data.users))
            .catch((error) => toast.error("Error al cargar usuarios", errorMessage(error)));
    }, [toast]);

    const load = React.useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { periodBymonth } = await api<{ periodBymonth: Period | null }>(`/api/periods?month=${ym.month}&year=${ym.year}`);
            if (!periodBymonth) {
                setRows([]);
                return;
            }
            const data = await api<{ periodExpenses: PeriodExpense[] }>(`/api/periodExpenses?periodId=${periodBymonth.id}&userId=${userId}`);
            setRows(data.periodExpenses);
        } catch (error) {
            toast.error("Error al cargar gastos", errorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [userId, ym, toast]);

    React.useEffect(() => {
        load();
    }, [load]);

    async function update(patch: PeriodExpensePatch) {
        if (!editing) return;
        await api("/api/periodExpenses", { method: "PUT", body: { id: editing.id, periodExpense: patch } });
        toast.success("Gasto actualizado");
        setEditing(null);
        await load();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/periodExpenses", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Gasto eliminado");
            setDeleting(null);
            await load();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    return (
        <AdminLayout title="Gastos por mes" description="Consulta y corrige los gastos mensuales de un usuario.">
            <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:flex-row sm:items-end">
                <Field label="Usuario" htmlFor="admin-user" className="flex-1">
                    <SelectField
                        id="admin-user"
                        value={userId}
                        onValueChange={setUserId}
                        placeholder="Selecciona un usuario"
                        options={users.map((u) => ({ value: String(u.id), label: u.name, description: u.email }))}
                    />
                </Field>
                <MonthSwitcher value={ym} current={today} onChange={setYm} />
            </div>

            {!userId ? (
                <EmptyState icon={<Users />} title="Elige un usuario" description="Selecciona un usuario y un mes para ver sus gastos registrados." />
            ) : (
                <AdminTable
                    title="Gastos del mes"
                    rows={rows}
                    loading={loading}
                    rowKey={(r) => r.id}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                    empty="Este usuario no tiene gastos en el mes seleccionado."
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
                        { header: "Fecha", cell: (r) => formatDateShort(r.expense_date) },
                        { header: "Valor", cell: (r) => <span className="font-medium tabular">{formatMoney(r.amount)}</span>, className: "text-right" },
                        {
                            header: "Estado",
                            cell: (r) => (Number(r.state_id) === ExpenseState.PAID ? <Badge tone="success">Pagado</Badge> : <Badge tone="warning">Pendiente</Badge>),
                        },
                    ]}
                />
            )}

            <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar gasto del mes">
                {editing && <PeriodExpenseForm key={editing.id} expense={editing} onSubmit={update} onCancel={() => setEditing(null)} showAccount={false} />}
            </Dialog>
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar gasto?"
                description={deleting ? `"${deleting.name}" (${formatMoney(deleting.amount)}).` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AdminLayout>
    );
}
