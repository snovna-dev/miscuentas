import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { CalendarDays, MoreHorizontal, Pencil, Repeat, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { AnimatedMoney } from "@/components/finance/AnimatedNumber";
import { api, errorMessage } from "@/lib/client/api";
import { monthLabel, parseISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { frequencyLabel, lastInstallmentMonth, monthlyEquivalent } from "@/lib/schedule";
import { compareYM } from "@/lib/dates";
import { useCurrentMonth } from "@/contexts/TodayContext";
import { Badge } from "@/components/ui/primitives";
import type { CreatedPeriodExpense, Expense, ExpenseInput } from "@/types";

export const getServerSideProps = withPageAuth("user");

export default function FixedExpenses() {
    const toast = useToast();
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState<Expense | null>(null);
    const [deleting, setDeleting] = React.useState<Expense | null>(null);

    const load = React.useCallback(async () => {
        try {
            const data = await api<{ expenses: Expense[] }>("/api/expenses?type=fixed");
            setExpenses(data.expenses.map((e) => ({ ...e, amount: Number(e.amount) })));
        } catch (error) {
            toast.error("No pudimos cargar tus gastos fijos", errorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        load();
    }, [load]);

    /** Crea la definición y la registra en el mes de su fecha (también si es futura). */
    async function create(values: ExpenseInput) {
        const created = await api<CreatedPeriodExpense>("/api/periodExpenses", { method: "POST", body: { kind: "fixed", expense: values } });
        if (created.relative === "future") {
            toast.future(`Gasto fijo desde ${created.period.label}`, `"${values.name}" empezará a cobrarse en ese mes.`);
        } else {
            toast.success("Gasto fijo agregado", `Registrado en ${created.period.label} y se repetirá cada mes.`);
        }
        await load();
    }

    async function update(values: ExpenseInput) {
        if (!editing) return;
        const result = await api<{ updatedInstances: number }>("/api/expenses", { method: "PUT", body: { id: editing.id, expense: values } });
        toast.success(
            "Gasto fijo actualizado",
            result.updatedInstances > 0 ? `También se actualizó el valor de ${result.updatedInstances} pago(s) pendiente(s).` : undefined
        );
        setEditing(null);
        await load();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/expenses", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Gasto fijo eliminado", "Ya no se repetirá. Tu historial de pagos se conserva.");
            setDeleting(null);
            await load();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    const current = useCurrentMonth();
    // Equivalente mensual: un SOAT anual suma 1/12 de su valor a cada mes.
    const monthlyTotal = expenses.reduce((acc, e) => acc + monthlyEquivalent(e.amount, e.frequency_months), 0);

    return (
        <AppShell title="Gastos fijos">
            <PageHeader
                eyebrow="Gastos fijos"
                title="Tus compromisos de cada mes"
                description="Arriendo, servicios, créditos, suscripciones… Se registran solos al inicio de cada mes para que no olvides ningún pago."
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
                <Card className="h-fit lg:col-span-2 animate-fade-up">
                    <CardHeader>
                        <CardTitle>Agregar gasto fijo</CardTitle>
                        <CardDescription>La fecha indica el día de pago y el mes desde el que empieza a repetirse.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExpenseForm kind="fixed" onSubmit={create} compact idPrefix="fixed" />
                    </CardContent>
                </Card>

                <Card className="overflow-hidden lg:col-span-3">
                    <CardHeader className="flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Gastos fijos activos</CardTitle>
                            <CardDescription>{loading ? "Cargando…" : `${expenses.length} compromiso${expenses.length === 1 ? "" : "s"} mensuales`}</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Equivalente mensual</p>
                            {loading ? <Skeleton className="mt-1 h-6 w-28" /> : <AnimatedMoney value={Math.round(monthlyTotal)} className="text-lg font-semibold tabular" />}
                        </div>
                    </CardHeader>

                    <div className="mt-4">
                        {loading ? (
                            <div className="space-y-3 p-5">
                                {[0, 1, 2].map((i) => (
                                    <Skeleton key={i} className="h-14 rounded-xl" />
                                ))}
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="p-5 sm:p-6">
                                <EmptyState icon={<Repeat />} title="Aún no tienes gastos fijos" description="Agrega tus pagos recurrentes y MizCuentas los registrará automáticamente cada mes." />
                            </div>
                        ) : (
                            <ul className="divide-y border-t stagger">
                                {expenses.map((expense) => {
                                    const parts = parseISODate(expense.expense_date.slice(0, 10));
                                    const schedule = { start: expense.expense_date, frequency: expense.frequency_months, installments: expense.installments };
                                    const last = lastInstallmentMonth(schedule);
                                    const finished = last ? compareYM(last, current) < 0 : false;
                                    return (
                                        <li key={expense.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:gap-4 sm:px-6">
                                            <CategoryIcon name={expense.category_name} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <p className="truncate font-medium">{expense.name}</p>
                                                    {Number(expense.frequency_months ?? 1) !== 1 && <Badge tone="info" className="py-0 text-[11px]">{frequencyLabel(expense.frequency_months)}</Badge>}
                                                    {expense.installments ? (
                                                        <Badge tone={finished ? "success" : "brand"} className="py-0 text-[11px]">
                                                            {finished ? "Pagado por completo" : `${expense.installments} cuotas · hasta ${monthLabel(last!)}`}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                                    <span>{expense.category_name}</span>
                                                    {parts && (
                                                        <>
                                                            <span aria-hidden="true">·</span>
                                                            <span className="inline-flex items-center gap-1">
                                                                <CalendarDays className="size-3" /> Día {parts.day} · desde {monthLabel(parts)}
                                                            </span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <p className="font-semibold tabular">{formatMoney(expense.amount)}</p>
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger asChild>
                                                    <button type="button" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={`Opciones de ${expense.name}`}>
                                                        <MoreHorizontal className="size-4" />
                                                    </button>
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Portal>
                                                    <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-40 rounded-2xl border bg-popover p-1.5 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                                                        <DropdownMenu.Item onSelect={() => setEditing(expense)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted">
                                                            <Pencil className="size-4" /> Editar
                                                        </DropdownMenu.Item>
                                                        <DropdownMenu.Item onSelect={() => setDeleting(expense)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10">
                                                            <Trash2 className="size-4" /> Eliminar
                                                        </DropdownMenu.Item>
                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Portal>
                                            </DropdownMenu.Root>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </Card>
            </div>

            <Dialog
                open={Boolean(editing)}
                onOpenChange={(open) => !open && setEditing(null)}
                title="Editar gasto fijo"
                description="El nuevo valor se aplica a los pagos pendientes desde este mes."
                icon={<Pencil className="size-5" />}
            >
                {editing && (
                    <ExpenseForm
                        key={editing.id}
                        kind="fixed"
                        initial={{ ...editing, description: editing.description ?? "" }}
                        onSubmit={update}
                        onCancel={() => setEditing(null)}
                        idPrefix="edit-fixed"
                    />
                )}
            </Dialog>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar este gasto fijo?"
                description={deleting ? `"${deleting.name}" dejará de repetirse y se quitarán sus pagos pendientes desde este mes. Los pagos ya realizados se conservan.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AppShell>
    );
}
