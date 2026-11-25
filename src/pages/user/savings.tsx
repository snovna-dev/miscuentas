import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { ArrowDownToLine, ArrowUpFromLine, CalendarClock, History, MoreHorizontal, Pencil, PiggyBank, Plus, Target, Trash2, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/buttons";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import { AnimatedMoney } from "@/components/finance/AnimatedNumber";
import { ProgressRing } from "@/components/finance/ProgressRing";
import { AccountSelect, accountValue, NO_ACCOUNT } from "@/components/finance/AccountSelect";
import { Confetti } from "@/components/feedback/Confetti";
import { useToday } from "@/contexts/TodayContext";
import { useAccounts } from "@/hooks/useAccounts";
import { api, errorMessage } from "@/lib/client/api";
import { compareYM, formatDateLong, formatDateShort, monthLabel, parseISODate, ymIndex } from "@/lib/dates";
import { formatMoney, percent } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { cn } from "@/lib/utils";
import type { SavingsContribution, SavingsGoal, SavingsGoalInput } from "@/types";

export const getServerSideProps = withPageAuth("user");

const COLORS: Record<string, { ring: string; chip: string; label: string }> = {
    emerald: { ring: "#10b981", chip: "bg-emerald-500", label: "Esmeralda" },
    sky: { ring: "#0ea5e9", chip: "bg-sky-500", label: "Cielo" },
    violet: { ring: "#8b5cf6", chip: "bg-violet-500", label: "Violeta" },
    amber: { ring: "#f59e0b", chip: "bg-amber-500", label: "Ámbar" },
    rose: { ring: "#f43f5e", chip: "bg-rose-500", label: "Rosa" },
    teal: { ring: "#14b8a6", chip: "bg-teal-500", label: "Turquesa" },
};

const IDEAS = ["Fondo de emergencia", "Viaje", "Carro", "Cuota inicial vivienda", "Estudio", "Regalos de diciembre"];

/** Cuánto ahorrar al mes para llegar a la meta en la fecha objetivo. */
function monthlyNeeded(goal: SavingsGoal, today: string) {
    if (!goal.target_date) return null;
    const remaining = goal.target_amount - goal.saved;
    if (remaining <= 0) return 0;
    const now = parseISODate(today)!;
    const target = parseISODate(goal.target_date);
    if (!target) return null;
    const months = ymIndex(target) - ymIndex(now) + 1;
    if (months <= 0) return remaining;
    return Math.ceil(remaining / months);
}

function GoalForm({ initial, onSubmit, onCancel }: { initial?: SavingsGoal | null; onSubmit: (v: SavingsGoalInput) => Promise<void>; onCancel: () => void }) {
    const [name, setName] = React.useState(initial?.name ?? "");
    const [target, setTarget] = React.useState<number | null>(initial?.target_amount ?? null);
    const [date, setDate] = React.useState(initial?.target_date ?? "");
    const [color, setColor] = React.useState(initial?.color ?? "emerald");
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (name.trim().length < 2) return setError("Ponle un nombre a tu meta.");
        if (!target || target <= 0) return setError("Indica cuánto quieres ahorrar.");
        setBusy(true);
        setError(null);
        try {
            await onSubmit({ name: name.trim(), target_amount: target, target_date: date || null, color });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="¿Para qué estás ahorrando?" htmlFor="goal-name" required>
                <Input id="goal-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Ej: Viaje a Cartagena" autoFocus />
                {!initial && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {IDEAS.map((idea) => (
                            <button key={idea} type="button" onClick={() => setName(idea)} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                                {idea}
                            </button>
                        ))}
                    </div>
                )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Meta" htmlFor="goal-target" required>
                    <MoneyInput id="goal-target" value={target} onValueChange={setTarget} placeholder="0" />
                </Field>
                <Field label="Fecha objetivo" htmlFor="goal-date" optional>
                    <Input id="goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
            </div>
            <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Color</legend>
                <div className="flex gap-2">
                    {Object.entries(COLORS).map(([key, value]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setColor(key)}
                            aria-label={value.label}
                            aria-pressed={color === key}
                            className={cn("size-8 rounded-full ring-offset-2 ring-offset-popover transition", value.chip, color === key ? "scale-110 ring-2 ring-foreground" : "opacity-70 hover:opacity-100")}
                        />
                    ))}
                </div>
            </fieldset>
            <FormError message={error} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" loading={busy}>
                    {initial ? "Guardar cambios" : "Crear meta"}
                </Button>
            </div>
        </form>
    );
}

function ContributionForm({ goal, mode, onDone, onCancel }: { goal: SavingsGoal; mode: "deposit" | "withdraw"; onDone: (amount: number) => Promise<void>; onCancel: () => void }) {
    const today = useToday();
    const { accounts, loading } = useAccounts();
    const [amount, setAmount] = React.useState<number | null>(null);
    const [date, setDate] = React.useState(today);
    const [note, setNote] = React.useState("");
    const [account, setAccount] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);
    const selected = account || (accounts[0] ? String(accounts[0].id) : NO_ACCOUNT);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!amount || amount <= 0) return setError("Indica un valor mayor a cero.");
        setBusy(true);
        setError(null);
        try {
            const signed = mode === "deposit" ? amount : -amount;
            await api("/api/savings/contributions", {
                method: "POST",
                body: { goalId: goal.id, amount: signed, date, note, bank_account_id: accountValue(selected) },
            });
            await onDone(signed);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={mode === "deposit" ? "¿Cuánto vas a ahorrar?" : "¿Cuánto vas a retirar?"} htmlFor="contrib-amount" required hint={mode === "withdraw" ? `Disponible en la meta: ${formatMoney(goal.saved)}` : undefined}>
                <MoneyInput id="contrib-amount" value={amount} onValueChange={setAmount} placeholder="0" autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fecha" htmlFor="contrib-date" required>
                    <Input id="contrib-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label={mode === "deposit" ? "Sale de la cuenta" : "Entra a la cuenta"} htmlFor="contrib-account">
                    <AccountSelect id="contrib-account" accounts={accounts} loading={loading} value={selected} onValueChange={setAccount} />
                </Field>
            </div>
            <Field label="Nota" htmlFor="contrib-note" optional>
                <Input id="contrib-note" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Prima de diciembre" />
            </Field>
            <FormError message={error} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" loading={busy} variant={mode === "deposit" ? "default" : "secondary"}>
                    {mode === "deposit" ? <ArrowDownToLine /> : <ArrowUpFromLine />}
                    {mode === "deposit" ? "Ahorrar" : "Retirar"}
                </Button>
            </div>
        </form>
    );
}

export default function Savings() {
    const toast = useToast();
    const today = useToday();
    const [goals, setGoals] = React.useState<SavingsGoal[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [creating, setCreating] = React.useState(false);
    const [editing, setEditing] = React.useState<SavingsGoal | null>(null);
    const [deleting, setDeleting] = React.useState<SavingsGoal | null>(null);
    const [contrib, setContrib] = React.useState<{ goal: SavingsGoal; mode: "deposit" | "withdraw" } | null>(null);
    const [history, setHistory] = React.useState<{ goal: SavingsGoal; items: SavingsContribution[] | null } | null>(null);
    const [confetti, setConfetti] = React.useState(0);

    const load = React.useCallback(async () => {
        try {
            const data = await api<{ goals: SavingsGoal[] }>("/api/savings");
            setGoals(data.goals);
            return data.goals;
        } catch (error) {
            toast.error("No pudimos cargar tus metas", errorMessage(error));
            return [];
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        load();
    }, [load]);

    async function create(values: SavingsGoalInput) {
        await api("/api/savings", { method: "POST", body: { goal: values } });
        toast.success("Meta creada", values.name);
        setCreating(false);
        await load();
    }

    async function update(values: SavingsGoalInput) {
        if (!editing) return;
        await api("/api/savings", { method: "PUT", body: { id: editing.id, goal: values } });
        toast.success("Meta actualizada");
        setEditing(null);
        await load();
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api("/api/savings", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Meta eliminada", deleting.name);
            setDeleting(null);
            await load();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    async function afterContribution(goal: SavingsGoal, amount: number) {
        setContrib(null);
        const fresh = await load();
        const updated = fresh.find((g) => g.id === goal.id);
        if (updated && amount > 0 && goal.saved < goal.target_amount && updated.saved >= updated.target_amount) {
            setConfetti((n) => n + 1);
            toast.success("¡Meta cumplida! 🎉", `Llegaste a ${formatMoney(updated.target_amount)} para "${updated.name}".`);
        } else {
            toast.success(amount > 0 ? "Ahorro registrado" : "Retiro registrado", `${formatMoney(Math.abs(amount))} · ${goal.name}`);
        }
    }

    async function openHistory(goal: SavingsGoal) {
        setHistory({ goal, items: null });
        try {
            const data = await api<{ contributions: SavingsContribution[] }>(`/api/savings/contributions?goalId=${goal.id}`);
            setHistory({ goal, items: data.contributions });
        } catch (error) {
            toast.error("No se pudo cargar el historial", errorMessage(error));
        }
    }

    async function deleteContribution(item: SavingsContribution) {
        if (!history) return;
        try {
            await api("/api/savings/contributions", { method: "DELETE", body: { id: item.id } });
            toast.success("Movimiento eliminado");
            await load();
            await openHistory(history.goal);
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    const totalSaved = goals.reduce((a, g) => a + g.saved, 0);
    const totalTarget = goals.reduce((a, g) => a + g.target_amount, 0);
    const monthSaved = goals.reduce((a, g) => a + g.month_saved, 0);

    return (
        <AppShell title="Ahorro">
            <Confetti burstKey={confetti} count={48} />
            <PageHeader
                eyebrow="Ahorro"
                title="Metas que sí se cumplen"
                description="Define para qué ahorras, aporta cuando puedas y mira cómo avanzas. Los aportes se descuentan de tu disponible del mes."
                actions={
                    <Button onClick={() => setCreating(true)}>
                        <Plus /> Nueva meta
                    </Button>
                }
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-3 stagger">
                {[
                    { label: "Total ahorrado", value: totalSaved },
                    { label: "Ahorrado este mes", value: monthSaved },
                    { label: "Te falta para tus metas", value: Math.max(totalTarget - totalSaved, 0) },
                ].map((tile) => (
                    <div key={tile.label} className="rounded-2xl border bg-card p-5 shadow-soft">
                        <p className="text-sm text-muted-foreground">{tile.label}</p>
                        {loading ? <Skeleton className="mt-2 h-8 w-32" /> : <AnimatedMoney value={tile.value} className="mt-1 block text-2xl font-semibold tabular" />}
                    </div>
                ))}
            </div>

            <div className="mt-6">
                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-60 rounded-2xl" />
                        ))}
                    </div>
                ) : goals.length === 0 ? (
                    <EmptyState
                        icon={<PiggyBank />}
                        title="Aún no tienes metas de ahorro"
                        description="Empieza con un fondo de emergencia: lo ideal es tener entre 3 y 6 meses de tus gastos."
                        action={
                            <Button onClick={() => setCreating(true)}>
                                <Plus /> Crear mi primera meta
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger">
                        {goals.map((goal) => {
                            const color = COLORS[goal.color] ?? COLORS.emerald;
                            const share = percent(goal.saved, goal.target_amount);
                            const done = goal.saved >= goal.target_amount;
                            const needed = monthlyNeeded(goal, today);
                            const target = goal.target_date ? parseISODate(goal.target_date) : null;
                            const late = target && !done && compareYM(target, parseISODate(today)!) < 0;
                            return (
                                <Card key={goal.id} className="flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-lg font-semibold">{goal.name}</p>
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Target className="size-3.5" /> Meta {formatMoney(goal.target_amount)}
                                            </p>
                                        </div>
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger asChild>
                                                <button type="button" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={`Opciones de ${goal.name}`}>
                                                    <MoreHorizontal className="size-4" />
                                                </button>
                                            </DropdownMenu.Trigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-2xl border bg-popover p-1.5 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                                                    <DropdownMenu.Item onSelect={() => openHistory(goal)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted">
                                                        <History className="size-4" /> Historial
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item onSelect={() => setEditing(goal)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted">
                                                        <Pencil className="size-4" /> Editar
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item onSelect={() => setDeleting(goal)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10">
                                                        <Trash2 className="size-4" /> Eliminar
                                                    </DropdownMenu.Item>
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Root>
                                    </div>

                                    <div className="mt-4 flex items-center gap-5">
                                        <ProgressRing value={share} color={color.ring}>
                                            {done ? <Trophy className="size-7 text-amber-500 animate-pop" /> : <span className="text-lg font-semibold tabular">{share}%</span>}
                                        </ProgressRing>
                                        <div className="min-w-0 space-y-1">
                                            <p className="text-2xl font-semibold tabular">{formatMoney(goal.saved)}</p>
                                            <p className="text-xs text-muted-foreground">{done ? "¡Meta cumplida!" : `Faltan ${formatMoney(goal.target_amount - goal.saved)}`}</p>
                                            {goal.month_saved !== 0 && <p className="text-xs font-medium text-success">+{formatMoney(goal.month_saved)} este mes</p>}
                                        </div>
                                    </div>

                                    {goal.target_date && !done && (
                                        <p className={cn("mt-4 flex items-start gap-1.5 rounded-xl px-3 py-2 text-xs", late ? "bg-destructive/8 text-destructive" : "bg-muted/60 text-muted-foreground")}>
                                            <CalendarClock className="mt-px size-3.5 shrink-0" />
                                            {late
                                                ? `La fecha objetivo (${formatDateShort(goal.target_date)}) ya pasó.`
                                                : `Para ${monthLabel(target!)} ahorra ${formatMoney(needed ?? 0)} al mes.`}
                                        </p>
                                    )}

                                    <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                                        <Button size="sm" onClick={() => setContrib({ goal, mode: "deposit" })}>
                                            <ArrowDownToLine /> Ahorrar
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={goal.saved <= 0} onClick={() => setContrib({ goal, mode: "withdraw" })}>
                                            <ArrowUpFromLine /> Retirar
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <Dialog open={creating} onOpenChange={setCreating} title="Nueva meta de ahorro" icon={<PiggyBank className="size-5" />}>
                <GoalForm onSubmit={create} onCancel={() => setCreating(false)} />
            </Dialog>
            <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title="Editar meta" icon={<Pencil className="size-5" />}>
                {editing && <GoalForm key={editing.id} initial={editing} onSubmit={update} onCancel={() => setEditing(null)} />}
            </Dialog>
            <Dialog
                open={Boolean(contrib)}
                onOpenChange={(open) => !open && setContrib(null)}
                title={contrib?.mode === "withdraw" ? "Retirar de la meta" : "Ahorrar en la meta"}
                description={contrib?.goal.name}
                icon={contrib?.mode === "withdraw" ? <ArrowUpFromLine className="size-5" /> : <ArrowDownToLine className="size-5" />}
            >
                {contrib && (
                    <ContributionForm
                        key={`${contrib.goal.id}-${contrib.mode}`}
                        goal={contrib.goal}
                        mode={contrib.mode}
                        onDone={(amount) => afterContribution(contrib.goal, amount)}
                        onCancel={() => setContrib(null)}
                    />
                )}
            </Dialog>
            <Dialog open={Boolean(history)} onOpenChange={(open) => !open && setHistory(null)} title="Historial de la meta" description={history?.goal.name} icon={<History className="size-5" />}>
                {!history?.items ? (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-12 rounded-xl" />
                        ))}
                    </div>
                ) : history.items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay movimientos.</p>
                ) : (
                    <ul className="max-h-80 divide-y overflow-y-auto rounded-2xl border">
                        {history.items.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                                <span className={cn("flex size-9 items-center justify-center rounded-xl", item.amount >= 0 ? "bg-success/12 text-success" : "bg-warning/20 text-warning-foreground")}>
                                    {item.amount >= 0 ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{item.note || (item.amount >= 0 ? "Aporte" : "Retiro")}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDateLong(item.contribution_date)}
                                        {item.bank_name ? ` · ${item.bank_name}` : ""}
                                    </p>
                                </div>
                                <p className={cn("font-semibold tabular", item.amount >= 0 ? "text-success" : "")}>
                                    {item.amount >= 0 ? "+" : "−"}
                                    {formatMoney(Math.abs(item.amount))}
                                </p>
                                <button type="button" onClick={() => deleteContribution(item)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar movimiento">
                                    <Trash2 className="size-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Dialog>
            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar esta meta?"
                description={deleting ? `"${deleting.name}" dejará de mostrarse. Los aportes realizados (${formatMoney(deleting.saved)}) se conservan en tu historial de cuentas.` : undefined}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </AppShell>
    );
}
