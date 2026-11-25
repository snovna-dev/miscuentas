import * as React from "react";
import { Check, Gauge, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, Progress, Skeleton } from "@/components/ui/primitives";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { AnimatedMoney } from "@/components/finance/AnimatedNumber";
import { budgetTone } from "@/components/finance/BudgetBar";
import { useCurrentMonth } from "@/contexts/TodayContext";
import { api, errorMessage } from "@/lib/client/api";
import { monthLabel } from "@/lib/dates";
import { formatMoney, percent } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/types";

export const getServerSideProps = withPageAuth("user");

function BudgetRow({ item, onSave, onRemove }: { item: BudgetStatus; onSave: (amount: number) => Promise<void>; onRemove: () => Promise<void> }) {
    const [value, setValue] = React.useState<number | null>(item.budget);
    const [saving, setSaving] = React.useState(false);
    const dirty = (value ?? null) !== (item.budget ?? null) && Boolean(value);
    const tone = budgetTone(item.budget, item.spent);
    const share = item.budget ? percent(item.spent, item.budget) : 0;

    async function save() {
        if (!value || !dirty) return;
        setSaving(true);
        try {
            await onSave(value);
        } finally {
            setSaving(false);
        }
    }

    return (
        <li className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:px-6">
            <div className="flex items-center gap-3">
                <CategoryIcon name={item.category_name} />
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-medium">{item.category_name}</p>
                        <p className="shrink-0 text-xs text-muted-foreground tabular">
                            {formatMoney(item.spent)}
                            {item.budget ? ` de ${formatMoney(item.budget)}` : " este mes"}
                        </p>
                    </div>
                    {item.budget ? (
                        <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className={cn("h-full rounded-full transition-[width] duration-700", tone.bar)} style={{ width: `${Math.max(share, 2)}%` }} />
                            </div>
                            <span className={cn("w-12 text-right text-xs font-semibold tabular", tone.text)}>{share}%</span>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">Sin límite definido</p>
                    )}
                </div>
            </div>
            <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    save();
                }}
            >
                <div className="w-full sm:w-44">
                    <MoneyInput value={value} onValueChange={setValue} placeholder="Límite mensual" aria-label={`Presupuesto de ${item.category_name}`} className="h-10" />
                </div>
                <button
                    type="submit"
                    disabled={!dirty || saving}
                    className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl transition",
                        dirty ? "bg-primary text-primary-foreground hover:brightness-110" : "bg-muted text-muted-foreground opacity-50"
                    )}
                    aria-label="Guardar presupuesto"
                >
                    <Check className="size-4" />
                </button>
                {item.budget != null && (
                    <button
                        type="button"
                        onClick={async () => {
                            await onRemove();
                            setValue(null);
                        }}
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Quitar presupuesto"
                    >
                        <Trash2 className="size-4" />
                    </button>
                )}
            </form>
        </li>
    );
}

export default function Budgets() {
    const toast = useToast();
    const ym = useCurrentMonth();
    const [items, setItems] = React.useState<BudgetStatus[]>([]);
    const [loading, setLoading] = React.useState(true);

    const load = React.useCallback(async () => {
        try {
            const data = await api<{ budgets: BudgetStatus[] }>(`/api/budgets?year=${ym.year}&month=${ym.month}`);
            setItems(data.budgets);
        } catch (error) {
            toast.error("No pudimos cargar tus presupuestos", errorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [ym.year, ym.month, toast]);

    React.useEffect(() => {
        load();
    }, [load]);

    async function save(item: BudgetStatus, amount: number) {
        try {
            await api("/api/budgets", { method: "PUT", body: { category_id: item.category_id, amount } });
            toast.success("Presupuesto guardado", `${item.category_name}: ${formatMoney(amount)} al mes`);
            await load();
        } catch (error) {
            toast.error("No se pudo guardar", errorMessage(error));
        }
    }

    async function remove(item: BudgetStatus) {
        try {
            await api("/api/budgets", { method: "DELETE", body: { category_id: item.category_id } });
            toast.success("Presupuesto eliminado", item.category_name);
            await load();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    const withBudget = items.filter((i) => i.budget != null);
    const totalBudget = withBudget.reduce((a, i) => a + (i.budget ?? 0), 0);
    const totalSpent = withBudget.reduce((a, i) => a + i.spent, 0);
    const alerts = withBudget.filter((i) => budgetTone(i.budget, i.spent).level === "warning" || budgetTone(i.budget, i.spent).level === "exceeded");
    const groups = [
        { title: "Gastos variables", hint: "Donde más se escapa el dinero: comida, salidas, compras…", items: items.filter((i) => Number(i.category_type) === 2) },
        { title: "Gastos fijos", hint: "Útil para controlar servicios que varían (energía, agua…).", items: items.filter((i) => Number(i.category_type) === 1) },
    ];

    return (
        <AppShell title="Presupuestos">
            <PageHeader
                eyebrow="Presupuestos"
                title="Pon límites a tus gastos"
                description={`Define cuánto quieres gastar al mes por categoría. Te avisaremos al llegar al 80% y si lo superas. Mes: ${monthLabel(ym)}.`}
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-3 stagger">
                <div className="rounded-2xl border bg-card p-5 shadow-soft">
                    <p className="text-sm text-muted-foreground">Presupuesto total</p>
                    {loading ? <Skeleton className="mt-2 h-8 w-32" /> : <AnimatedMoney value={totalBudget} className="mt-1 block text-2xl font-semibold tabular" />}
                </div>
                <div className="rounded-2xl border bg-card p-5 shadow-soft">
                    <p className="text-sm text-muted-foreground">Gastado en esas categorías</p>
                    {loading ? <Skeleton className="mt-2 h-8 w-32" /> : <AnimatedMoney value={totalSpent} className="mt-1 block text-2xl font-semibold tabular" />}
                    <Progress value={percent(totalSpent, totalBudget)} className="mt-3 h-1.5" barClassName={totalSpent > totalBudget ? "bg-destructive" : undefined} label="Uso del presupuesto total" />
                </div>
                <div className={cn("rounded-2xl border p-5 shadow-soft", alerts.length ? "border-warning/50 bg-warning/10" : "bg-card")}>
                    <p className="text-sm text-muted-foreground">Alertas activas</p>
                    <p className="mt-1 text-2xl font-semibold">{loading ? "—" : alerts.length}</p>
                    <p className="text-xs text-muted-foreground">{alerts.length ? alerts.map((a) => a.category_name).join(", ") : "Vas bien este mes"}</p>
                </div>
            </div>

            <div className="mt-6 space-y-6">
                {groups.map((group) => (
                    <Card key={group.title} className="overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gauge className="size-4 text-primary" /> {group.title}
                            </CardTitle>
                            <CardDescription>{group.hint}</CardDescription>
                        </CardHeader>
                        {loading ? (
                            <CardContent className="space-y-3">
                                {[0, 1, 2].map((i) => (
                                    <Skeleton key={i} className="h-14 rounded-xl" />
                                ))}
                            </CardContent>
                        ) : (
                            <ul className="mt-4 divide-y border-t">
                                {group.items.map((item) => (
                                    <BudgetRow key={`${item.category_id}-${item.budget}`} item={item} onSave={(amount) => save(item, amount)} onRemove={() => remove(item)} />
                                ))}
                            </ul>
                        )}
                    </Card>
                ))}
            </div>
        </AppShell>
    );
}
