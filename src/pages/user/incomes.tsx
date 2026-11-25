import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { Landmark, MoreHorizontal, Pencil, Repeat, StopCircle, Trash2, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { IncomeForm, type IncomeFormValues } from "@/components/forms/IncomeForm";
import { AnimatedMoney } from "@/components/finance/AnimatedNumber";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateLong, monthLabel, parseISODate, toYearMonthKey } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { useCurrentMonth } from "@/contexts/TodayContext";
import type { Income, IncomeInput, RecurringIncome } from "@/types";

export const getServerSideProps = withPageAuth("user");

export default function Incomes() {
    const toast = useToast();
    const currentMonth = useCurrentMonth();
    const [incomes, setIncomes] = React.useState<Income[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState<Income | null>(null);
    const [deleting, setDeleting] = React.useState<Income | null>(null);
    const [recurring, setRecurring] = React.useState<RecurringIncome[]>([]);
    const [editingRecurring, setEditingRecurring] = React.useState<RecurringIncome | null>(null);
    const [stopping, setStopping] = React.useState<RecurringIncome | null>(null);

    const loadRecurring = React.useCallback(async () => {
        try {
            const data = await api<{ recurringIncomes: RecurringIncome[] }>("/api/recurringIncomes");
            setRecurring(data.recurringIncomes);
        } catch {
            setRecurring([]);
        }
    }, []);

    React.useEffect(() => {
        loadRecurring();
    }, [loadRecurring]);

    async function updateRecurring(values: IncomeFormValues) {
        if (!editingRecurring) return;
        const result = await api<{ updated: number }>("/api/recurringIncomes", {
            method: "PUT",
            body: {
                id: editingRecurring.id,
                recurringIncome: { description: values.description || editingRecurring.description, amount: values.amount, start_date: editingRecurring.start_date, bank_account_id: values.bank_account_id },
            },
        });
        toast.success("Ingreso recurrente actualizado", result.updated ? "También se actualizó el registro de este mes." : undefined);
        setEditingRecurring(null);
        await Promise.all([load(), loadRecurring()]);
    }

    async function stopRecurring() {
        if (!stopping) return;
        try {
            await api("/api/recurringIncomes", { method: "DELETE", body: { id: stopping.id } });
            toast.success("Dejará de repetirse", "Los ingresos ya registrados se conservan.");
            setStopping(null);
            await Promise.all([load(), loadRecurring()]);
        } catch (error) {
            toast.error("No se pudo detener", errorMessage(error));
        }
    }

    const load = React.useCallback(async () => {
        try {
            const data = await api<{ incomes: Income[] }>("/api/incomes");
            setIncomes(data.incomes.map((income) => ({ ...income, amount: Number(income.amount) })));
        } catch (error) {
            toast.error("No pudimos cargar tus ingresos", errorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        load();
    }, [load]);

    async function create(values: IncomeFormValues) {
        if (values.recurring) {
            await api("/api/recurringIncomes", {
                method: "POST",
                body: {
                    recurringIncome: {
                        description: values.description || "Ingreso mensual",
                        amount: values.amount,
                        start_date: values.income_date,
                        bank_account_id: values.bank_account_id,
                    },
                },
            });
            toast.success("Ingreso recurrente creado", `${formatMoney(values.amount)} se registrará solo cada mes.`);
            await Promise.all([load(), loadRecurring()]);
            return;
        }
        await api("/api/incomes", { method: "POST", body: { income: values } });
        toast.success("Ingreso registrado", `${formatMoney(values.amount)} · ${values.description || "Sin descripción"}`);
        await load();
    }

    async function update(values: IncomeInput) {
        if (!editing) return;
        await api("/api/incomes", { method: "PUT", body: { id: editing.id, income: values } });
        toast.success("Ingreso actualizado");
        setEditing(null);
        await load();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/incomes", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Ingreso eliminado");
            setDeleting(null);
            await load();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    // Agrupa por mes para leer el historial de forma natural.
    const groups = React.useMemo(() => {
        const map = new Map<string, { label: string; total: number; items: Income[] }>();
        for (const income of incomes) {
            const parts = parseISODate(income.income_date.slice(0, 10));
            if (!parts) continue;
            const key = toYearMonthKey(parts);
            const group = map.get(key) ?? { label: monthLabel(parts), total: 0, items: [] };
            group.total += income.amount;
            group.items.push(income);
            map.set(key, group);
        }
        return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [incomes]);

    const thisMonthKey = toYearMonthKey(currentMonth);
    const thisMonth = groups.find(([key]) => key === thisMonthKey)?.[1].total ?? 0;
    const average = groups.length ? groups.slice(0, 6).reduce((acc, [, g]) => acc + g.total, 0) / Math.min(groups.length, 6) : 0;

    return (
        <AppShell title="Ingresos">
            <PageHeader eyebrow="Ingresos" title="Lo que entra a tu bolsillo" description="Registra salarios, honorarios y cualquier dinero que recibas para conocer tu disponible real." />

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="animate-fade-up">
                        <CardHeader>
                            <CardTitle>Nuevo ingreso</CardTitle>
                            <CardDescription>Se sumará al mes de la fecha que elijas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <IncomeForm onSubmit={create} allowRecurring />
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-3 stagger">
                        <div className="rounded-2xl border bg-card p-4 shadow-soft">
                            <p className="text-xs font-medium text-muted-foreground">Este mes</p>
                            {loading ? <Skeleton className="mt-2 h-7" /> : <AnimatedMoney value={thisMonth} className="mt-1 block text-xl font-semibold tabular" />}
                        </div>
                        <div className="rounded-2xl border bg-card p-4 shadow-soft">
                            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                <TrendingUp className="size-3.5" /> Promedio mensual
                            </p>
                            {loading ? <Skeleton className="mt-2 h-7" /> : <AnimatedMoney value={Math.round(average)} className="mt-1 block text-xl font-semibold tabular" />}
                        </div>
                    </div>

                    {recurring.length > 0 && (
                        <Card className="overflow-hidden animate-fade-up">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Repeat className="size-4 text-primary" /> Ingresos recurrentes
                                </CardTitle>
                                <CardDescription>Se registran solos cada mes.</CardDescription>
                            </CardHeader>
                            <ul className="mt-4 divide-y border-t">
                                {recurring.map((item) => (
                                    <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-success/12 text-success">
                                            <Repeat className="size-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{item.description}</p>
                                            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                                Día {parseISODate(item.start_date)?.day} de cada mes
                                                {item.bank_name && (
                                                    <>
                                                        {" · "}
                                                        <Landmark className="size-3" /> {item.bank_name}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <p className="text-sm font-semibold tabular">{formatMoney(item.amount)}</p>
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger asChild>
                                                <button type="button" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={`Opciones de ${item.description}`}>
                                                    <MoreHorizontal className="size-4" />
                                                </button>
                                            </DropdownMenu.Trigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-2xl border bg-popover p-1.5 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                                                    <DropdownMenu.Item onSelect={() => setEditingRecurring(item)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted">
                                                        <Pencil className="size-4" /> Editar
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item onSelect={() => setStopping(item)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10">
                                                        <StopCircle className="size-4" /> Dejar de repetir
                                                    </DropdownMenu.Item>
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Root>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>

                <Card className="overflow-hidden lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Historial</CardTitle>
                        <CardDescription>{loading ? "Cargando…" : `${incomes.length} ingreso${incomes.length === 1 ? "" : "s"} registrado${incomes.length === 1 ? "" : "s"}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {loading ? (
                            <div className="space-y-3">
                                {[0, 1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-14 rounded-xl" />
                                ))}
                            </div>
                        ) : incomes.length === 0 ? (
                            <EmptyState icon={<Wallet />} title="Aún no registras ingresos" description="Agrega tu salario u otros ingresos para calcular tu dinero disponible cada mes." />
                        ) : (
                            <div className="space-y-6">
                                {groups.map(([key, group]) => (
                                    <section key={key} className="animate-fade-up">
                                        <div className="mb-2 flex items-baseline justify-between">
                                            <h3 className="text-sm font-semibold">{group.label}</h3>
                                            <span className="text-sm font-medium tabular text-success">+ {formatMoney(group.total)}</span>
                                        </div>
                                        <ul className="divide-y rounded-2xl border">
                                            {group.items.map((income) => (
                                                <li key={income.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                                                    <span className="flex size-10 items-center justify-center rounded-xl bg-success/12 text-success">
                                                        <Wallet className="size-[18px]" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-medium">{income.description || "Ingreso"}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDateLong(income.income_date)}</p>
                                                    </div>
                                                    <p className="font-semibold tabular">{formatMoney(income.amount)}</p>
                                                    <DropdownMenu.Root>
                                                        <DropdownMenu.Trigger asChild>
                                                            <button type="button" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Opciones del ingreso">
                                                                <MoreHorizontal className="size-4" />
                                                            </button>
                                                        </DropdownMenu.Trigger>
                                                        <DropdownMenu.Portal>
                                                            <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-40 rounded-2xl border bg-popover p-1.5 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                                                                <DropdownMenu.Item onSelect={() => setEditing(income)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted">
                                                                    <Pencil className="size-4" /> Editar
                                                                </DropdownMenu.Item>
                                                                <DropdownMenu.Item onSelect={() => setDeleting(income)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10">
                                                                    <Trash2 className="size-4" /> Eliminar
                                                                </DropdownMenu.Item>
                                                            </DropdownMenu.Content>
                                                        </DropdownMenu.Portal>
                                                    </DropdownMenu.Root>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar ingreso" icon={<Pencil className="size-5" />}>
                {editing && (
                    <IncomeForm
                        key={editing.id}
                        initial={{ ...editing, description: editing.description ?? "" }}
                        onSubmit={update}
                        onCancel={() => setEditing(null)}
                        idPrefix="edit-income"
                    />
                )}
            </Dialog>

            <Dialog open={Boolean(editingRecurring)} onOpenChange={(open) => !open && setEditingRecurring(null)} title="Editar ingreso recurrente" description="El cambio aplica desde este mes." icon={<Repeat className="size-5" />}>
                {editingRecurring && (
                    <IncomeForm
                        key={editingRecurring.id}
                        initial={{ amount: editingRecurring.amount, income_date: editingRecurring.start_date, description: editingRecurring.description, bank_account_id: editingRecurring.bank_account_id }}
                        onSubmit={updateRecurring}
                        onCancel={() => setEditingRecurring(null)}
                        idPrefix="edit-recurring"
                    />
                )}
            </Dialog>

            <ConfirmDialog
                open={Boolean(stopping)}
                onOpenChange={(open) => !open && setStopping(null)}
                title="¿Dejar de repetir este ingreso?"
                description={stopping ? `"${stopping.description}" ya no se registrará en los próximos meses. Los ingresos ya registrados se conservan.` : undefined}
                confirmLabel="Dejar de repetir"
                onConfirm={stopRecurring}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar este ingreso?"
                description={deleting ? `Se eliminará ${formatMoney(deleting.amount)} del ${formatDateLong(deleting.income_date)}.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AppShell>
    );
}
