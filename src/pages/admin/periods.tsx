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
import { api, errorMessage } from "@/lib/client/api";
import { MONTH_NAMES } from "@/lib/dates";
import { withPageAuth } from "@/lib/ssr";
import { PeriodType } from "@/emuns/PeriodType";
import type { Period } from "@/types";

export const getServerSideProps = withPageAuth("admin");

const TYPE_LABEL: Record<number, string> = { 1: "Anual", 2: "Mensual", 3: "Semanal", 4: "Diario" };

type PeriodBody = { name_period: string; description: string; period_type: number; period_value: number; year: number | null; month: number | null };

function PeriodForm({ initial, onSubmit, onCancel }: { initial?: Period | null; onSubmit: (v: PeriodBody) => Promise<void>; onCancel?: () => void }) {
    const currentYear = new Date().getFullYear();
    const [type, setType] = React.useState(String(initial?.period_type ?? PeriodType.MONTHLY));
    const [year, setYear] = React.useState(String(initial?.year ?? currentYear));
    const [month, setMonth] = React.useState(String(initial?.month ?? new Date().getMonth() + 1));
    const [value, setValue] = React.useState(String(initial?.week ?? initial?.day ?? ""));
    const [name, setName] = React.useState(initial?.name ?? "");
    const [description, setDescription] = React.useState(initial?.description ?? "");
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);
    const t = Number(type);

    // Sugiere un nombre coherente según el tipo.
    const suggested = t === PeriodType.YEARLY ? year : t === PeriodType.MONTHLY ? MONTH_NAMES[Number(month) - 1] : t === PeriodType.WEEKLY ? `Semana ${value}` : `${value} de ${MONTH_NAMES[Number(month) - 1]}`;

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        const periodValue = t === PeriodType.YEARLY ? Number(year) : t === PeriodType.MONTHLY ? Number(month) : Number(value);
        try {
            await onSubmit({
                name_period: (name || suggested).trim(),
                description: description.trim() || `${TYPE_LABEL[t]} ${suggested} ${t === PeriodType.YEARLY ? "" : year}`.trim(),
                period_type: t,
                period_value: periodValue,
                year: Number(year),
                month: Number(month),
            });
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
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-4">
            <Field label="Tipo" htmlFor="p-type" required>
                <SelectField id="p-type" value={type} onValueChange={setType} options={[1, 2, 3, 4].map((v) => ({ value: String(v), label: TYPE_LABEL[v] }))} />
            </Field>
            <Field label="Año" htmlFor="p-year" required>
                <Input id="p-year" type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
            </Field>
            {(t === PeriodType.MONTHLY || t === PeriodType.DAILY) && (
                <Field label="Mes" htmlFor="p-month" required>
                    <SelectField id="p-month" value={month} onValueChange={setMonth} options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))} />
                </Field>
            )}
            {(t === PeriodType.WEEKLY || t === PeriodType.DAILY) && (
                <Field label={t === PeriodType.WEEKLY ? "Semana" : "Día"} htmlFor="p-value" required>
                    <Input id="p-value" type="number" min={1} max={t === PeriodType.WEEKLY ? 53 : 31} value={value} onChange={(e) => setValue(e.target.value)} />
                </Field>
            )}
            <Field label="Nombre" htmlFor="p-name" optional className="sm:col-span-2">
                <Input id="p-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={suggested} />
            </Field>
            <Field label="Descripción" htmlFor="p-desc" optional className="sm:col-span-2">
                <Input id="p-desc" value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="sm:col-span-4">
                <FormError message={error} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-4">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" loading={busy}>
                    {initial ? <Save /> : <Plus />} {initial ? "Guardar" : "Crear período"}
                </Button>
            </div>
        </form>
    );
}

export default function AdminPeriods() {
    const toast = useToast();
    const [editing, setEditing] = React.useState<Period | null>(null);
    const [deleting, setDeleting] = React.useState<Period | null>(null);
    const { rows, loading, reload } = useCollection(
        async () => (await api<{ periods: Period[] }>("/api/periods")).periods,
        (message) => toast.error("Error al cargar períodos", message)
    );

    async function create(values: PeriodBody) {
        await api("/api/periods", { method: "POST", body: { period: values } });
        toast.success("Período creado", values.name_period);
        await reload();
    }

    async function update(values: PeriodBody) {
        if (!editing) return;
        await api("/api/periods", { method: "PUT", body: { id: editing.id, period: values } });
        toast.success("Período actualizado");
        setEditing(null);
        await reload();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/periods", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Período eliminado");
            setDeleting(null);
            await reload();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    return (
        <AdminLayout title="Períodos" description="Los meses se crean automáticamente cuando un usuario registra un gasto con esa fecha. Aquí puedes crearlos o ajustarlos manualmente.">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <PeriodForm onSubmit={create} />
            </div>
            <AdminTable
                title="Períodos"
                rows={rows}
                loading={loading}
                rowKey={(r) => r.id}
                onEdit={setEditing}
                onDelete={setDeleting}
                columns={[
                    { header: "Nombre", cell: (r) => <span className="font-medium">{r.name}</span>, search: (r) => `${r.name} ${r.year ?? ""}` },
                    { header: "Tipo", cell: (r) => <Badge tone={Number(r.period_type) === 1 ? "brand" : "neutral"}>{TYPE_LABEL[Number(r.period_type)]}</Badge> },
                    { header: "Año", cell: (r) => r.year ?? "—" },
                    { header: "Mes", cell: (r) => (r.month ? MONTH_NAMES[r.month - 1] : "—") },
                    { header: "Semana / día", cell: (r) => r.week ?? r.day ?? "—" },
                    { header: "Descripción", cell: (r) => <span className="text-muted-foreground">{r.description || "—"}</span> },
                ]}
            />
            <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar período" className="sm:max-w-2xl">
                {editing && <PeriodForm key={editing.id} initial={editing} onSubmit={update} onCancel={() => setEditing(null)} />}
            </Dialog>
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar período?"
                description={deleting ? `"${deleting.name}" se eliminará solo si no tiene gastos registrados.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AdminLayout>
    );
}
