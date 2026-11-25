import * as React from "react";
import { useRouter } from "next/router";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CalendarClock,
    CircleDollarSign,
    Plus,
    Receipt,
    RefreshCw,
    Repeat,
    Search,
    Sparkles,
    Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Progress, Segmented, Skeleton } from "@/components/ui/primitives";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { StatCard } from "@/components/finance/StatCard";
import { MonthSwitcher } from "@/components/finance/MonthSwitcher";
import { ExpenseItem, ExpenseListSkeleton } from "@/components/finance/ExpenseItem";
import { CategoryBreakdown } from "@/components/finance/CategoryBreakdown";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { Confetti } from "@/components/feedback/Confetti";
import { BudgetBar } from "@/components/finance/BudgetBar";
import { ProgressRing } from "@/components/finance/ProgressRing";
import Link from "next/link";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { PeriodExpenseForm } from "@/components/forms/PeriodExpenseForm";
import { api, errorMessage } from "@/lib/client/api";
import { compareYM, formatDateShort, monthLabel, parseISODate, type YearMonth } from "@/lib/dates";
import { formatMoney, percent } from "@/lib/format";
import { withPageAuth, type AuthedPageProps } from "@/lib/ssr";
import { ExpenseState } from "@/emuns/ExpenseState";
import type { CreatedPeriodExpense, DashboardData, ExpenseInput, PeriodExpense, PeriodExpensePatch } from "@/types";

export const getServerSideProps = withPageAuth("user");

type Filter = "all" | "pending" | "paid";

function parseMonthQuery(value: unknown): YearMonth | null {
    if (typeof value !== "string") return null;
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
    return { year, month };
}

function useGreeting() {
    // Se calcula tras montar: la hora del servidor puede no coincidir con la del usuario.
    const [text, setText] = React.useState("Hola");
    React.useEffect(() => {
        const hour = new Date().getHours();
        setText(hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches");
    }, []);
    return text;
}

export default function Dashboard({ user, today: todayISO }: AuthedPageProps) {
    const router = useRouter();
    const toast = useToast();
    const today = React.useMemo<YearMonth>(() => {
        const parts = parseISODate(todayISO)!;
        return { year: parts.year, month: parts.month };
    }, [todayISO]);
    const greeting = useGreeting();
    const [ym, setYm] = React.useState<YearMonth>(() => parseMonthQuery(router.query.m) ?? today);
    const [data, setData] = React.useState<DashboardData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [filter, setFilter] = React.useState<Filter>("all");
    const [query, setQuery] = React.useState("");
    const [busyIds, setBusyIds] = React.useState<Set<number>>(new Set());
    const [editing, setEditing] = React.useState<PeriodExpense | null>(null);
    const [deleting, setDeleting] = React.useState<PeriodExpense | null>(null);
    const [addOpen, setAddOpen] = React.useState(false);
    const [confetti, setConfetti] = React.useState(0);
    const requestRef = React.useRef<AbortController | null>(null);

    const load = React.useCallback(async (target: YearMonth) => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setLoadError(null);
        try {
            const result = await api<DashboardData>(`/api/dashboard?year=${target.year}&month=${target.month}`, { signal: controller.signal });
            setData(result);
        } catch (error) {
            if ((error as Error).name === "AbortError") return;
            setLoadError(errorMessage(error, "No pudimos cargar tu información."));
        } finally {
            if (requestRef.current === controller) setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load(ym);
        return () => requestRef.current?.abort();
    }, [ym, load]);

    function changeMonth(next: YearMonth) {
        setYm(next);
        setFilter("all");
        const isToday = compareYM(next, today) === 0;
        const m = `${next.year}-${String(next.month).padStart(2, "0")}`;
        router.replace({ pathname: router.pathname, query: isToday ? {} : { m } }, undefined, { shallow: true, scroll: false });
    }

    /* ------------------------------ Acciones ------------------------------ */

    function patchLocal(id: number, patch: Partial<PeriodExpense>) {
        setData((current) => {
            if (!current) return current;
            const apply = (list: PeriodExpense[]) => list.map((item) => (item.id === id ? { ...item, ...patch } : item));
            return { ...current, expenses: apply(current.expenses), overdue: apply(current.overdue), upcoming: apply(current.upcoming) };
        });
    }

    async function togglePaid(expense: PeriodExpense) {
        const nextState = Number(expense.state_id) === ExpenseState.PAID ? ExpenseState.PENDING : ExpenseState.PAID;
        setBusyIds((s) => new Set(s).add(expense.id));
        // Actualización optimista: la UI responde al instante y se revierte si falla.
        patchLocal(expense.id, { state_id: nextState, state: nextState === ExpenseState.PAID ? "Pago" : "Pendiente" });

        try {
            await api("/api/periodExpenses", { method: "PUT", body: { id: expense.id, periodExpense: { expense_state_id: nextState } } });

            if (nextState === ExpenseState.PAID && data) {
                const remaining = data.expenses.filter((e) => e.id !== expense.id && Number(e.state_id) === ExpenseState.PENDING).length;
                const inMonth = data.expenses.some((e) => e.id === expense.id);
                if (inMonth && remaining === 0) {
                    setConfetti((n) => n + 1);
                    toast.success("¡Todo al día!", `Pagaste todos los gastos de ${data.period.label}.`);
                } else {
                    toast.success("Pago registrado", `${expense.name} · ${formatMoney(expense.amount)}`);
                }
            }
            await load(ym);
        } catch (error) {
            patchLocal(expense.id, { state_id: expense.state_id, state: expense.state });
            toast.error("No se pudo actualizar el pago", errorMessage(error));
        } finally {
            setBusyIds((s) => {
                const next = new Set(s);
                next.delete(expense.id);
                return next;
            });
        }
    }

    async function createVariable(values: ExpenseInput) {
        const created = await api<CreatedPeriodExpense>("/api/periodExpenses", {
            method: "POST",
            body: { kind: "variable", expense: values },
        });

        if (created.relative === "future") {
            toast.future(`Programado para ${created.period.label}`, `"${values.name}" no afecta este mes. Lo verás en Próximos gastos.`);
        } else if (created.relative === "past") {
            toast.info(`Registrado en ${created.period.label}`, "Quedó como pendiente de ese mes.");
        } else {
            toast.success("Gasto registrado", `${values.name} · ${formatMoney(values.amount)}`);
        }
        // Alerta de presupuesto (80% o superado) para la categoría del gasto.
        if (created.budgetAlert) {
            const a = created.budgetAlert;
            const message = `Llevas ${formatMoney(a.spent)} de ${formatMoney(a.budget)} en ${a.category_name}.`;
            if (a.level === "exceeded") toast.error(`Superaste tu presupuesto de ${a.category_name}`, message);
            else toast.info(`Presupuesto de ${a.category_name} casi agotado`, message);
        }
        setAddOpen(false);
        await load(ym);
    }

    async function saveEdit(patch: PeriodExpensePatch) {
        if (!editing) return;
        const result = await api<{ moved: { label: string } | null }>("/api/periodExpenses", {
            method: "PUT",
            body: { id: editing.id, periodExpense: patch },
        });
        setEditing(null);
        if (result.moved) toast.future("Gasto movido de mes", `Ahora está registrado en ${result.moved.label}.`);
        else toast.success("Cambios guardados");
        await load(ym);
    }

    async function confirmDelete() {
        if (!deleting) return;
        try {
            await api("/api/periodExpenses", { method: "DELETE", body: { id: deleting.id } });
            toast.success("Gasto eliminado", deleting.name);
            setDeleting(null);
            await load(ym);
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    /* ------------------------------- Derivados ------------------------------ */

    const expenses = data?.expenses ?? [];
    const pendingCount = expenses.filter((e) => Number(e.state_id) === ExpenseState.PENDING).length;
    const paidCount = expenses.length - pendingCount;
    const term = query.trim().toLowerCase();
    const visible = expenses.filter((e) => {
        if (filter === "pending" && Number(e.state_id) !== ExpenseState.PENDING) return false;
        if (filter === "paid" && Number(e.state_id) !== ExpenseState.PAID) return false;
        if (term && !`${e.name} ${e.category_name} ${e.description ?? ""}`.toLowerCase().includes(term)) return false;
        return true;
    });

    const totals = data?.totals;
    const paidShare = totals ? percent(totals.paid, totals.expenses) : 0;
    const relative = data?.relative ?? "current";
    const firstLoad = loading && !data;
    const label = monthLabel(ym);
    const firstName = user.name.split(" ")[0];

    return (
        <AppShell title="Resumen">
            <Confetti burstKey={confetti} />

            <PageHeader
                eyebrow={`${greeting}, ${firstName} 👋`}
                title={relative === "future" ? `Planeando ${label}` : relative === "past" ? `Así cerró ${label}` : "Tu mes en un vistazo"}
                description={
                    relative === "future"
                        ? "Gastos ya programados y fijos proyectados para ese mes."
                        : relative === "past"
                          ? "Consulta lo que pagaste y lo que quedó pendiente."
                          : "Registra tus gastos, marca tus pagos y mantén tu presupuesto bajo control."
                }
                actions={<MonthSwitcher value={ym} current={today} onChange={changeMonth} />}
            />

            {loadError && !data ? (
                <Card className="mt-8">
                    <CardContent>
                        <EmptyState
                            icon={<AlertTriangle />}
                            title="No pudimos cargar tu información"
                            description={loadError}
                            action={
                                <Button onClick={() => load(ym)}>
                                    <RefreshCw /> Reintentar
                                </Button>
                            }
                        />
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* KPIs */}
                    <section aria-label="Resumen del mes" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger">
                        <StatCard
                            label="Ingresos del mes"
                            value={(totals?.income ?? 0) + (totals?.projectedIncome ?? 0)}
                            loading={firstLoad}
                            tone="success"
                            icon={<ArrowDownRight />}
                            hint={
                                data
                                    ? data.projectedIncomes.length > 0
                                        ? `Incluye ${formatMoney(totals!.projectedIncome)} recurrente proyectado`
                                        : `${data.incomes.length} ingreso${data.incomes.length === 1 ? "" : "s"} registrado${data.incomes.length === 1 ? "" : "s"}`
                                    : undefined
                            }
                        />
                        <StatCard
                            label="Gastos del mes"
                            value={totals?.expenses ?? 0}
                            loading={firstLoad}
                            tone="brand"
                            icon={<Receipt />}
                            hint={data ? `${paidShare}% pagado` : undefined}
                        >
                            <Progress value={paidShare} className="mt-3 h-1.5" label="Porcentaje pagado del mes" />
                        </StatCard>
                        <StatCard
                            label={relative === "current" ? "Por pagar" : relative === "future" ? "Proyectado" : "Quedó pendiente"}
                            value={(totals?.pending ?? 0) + (relative === "current" ? (totals?.overdue ?? 0) : 0) + (relative === "future" ? (totals?.projected ?? 0) : 0)}
                            loading={firstLoad}
                            tone={totals && totals.overdue > 0 && relative === "current" ? "danger" : "warning"}
                            icon={<CalendarClock />}
                            hint={
                                data && relative === "current" && totals!.overdue > 0
                                    ? `Incluye ${formatMoney(totals!.overdue)} de meses anteriores`
                                    : data
                                      ? `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}`
                                      : undefined
                            }
                        />
                        <StatCard
                            label="Disponible"
                            value={totals?.balance ?? 0}
                            loading={firstLoad}
                            tone={(totals?.balance ?? 0) >= 0 ? "info" : "danger"}
                            icon={<CircleDollarSign />}
                            valueClassName={(totals?.balance ?? 0) < 0 ? "text-destructive" : undefined}
                            hint={
                                data
                                    ? (totals?.balance ?? 0) < 0
                                        ? "Tus gastos superan tus ingresos"
                                        : totals!.savings > 0
                                          ? `Después de gastos y ${formatMoney(totals!.savings)} ahorrados`
                                          : "Ingresos menos gastos del mes"
                                    : undefined
                            }
                        />
                    </section>

                    <div className="mt-6 grid gap-6 lg:grid-cols-3">
                        {/* Columna principal */}
                        <div className="space-y-6 lg:col-span-2">
                            {relative === "current" && data && data.overdue.length > 0 && (
                                <Card className="overflow-hidden border-destructive/25 animate-fade-up">
                                    <CardHeader className="flex-row items-center gap-3">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
                                            <AlertTriangle className="size-[18px]" />
                                        </span>
                                        <div>
                                            <CardTitle>Pendientes de meses anteriores</CardTitle>
                                            <CardDescription>
                                                {data.overdue.length} gasto{data.overdue.length === 1 ? "" : "s"} por {formatMoney(data.totals.overdue)}. Ponte al día.
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <ul className="mt-4 divide-y border-t">
                                        {data.overdue.map((expense) => (
                                            <ExpenseItem
                                                key={expense.id}
                                                expense={expense}
                                                today={data.today}
                                                variant="overdue"
                                                busy={busyIds.has(expense.id)}
                                                onTogglePaid={togglePaid}
                                                onEdit={setEditing}
                                                onDelete={setDeleting}
                                            />
                                        ))}
                                    </ul>
                                </Card>
                            )}

                            <Card className="overflow-hidden">
                                <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle>Gastos de {label}</CardTitle>
                                        <CardDescription>
                                            {data ? `${expenses.length} registrado${expenses.length === 1 ? "" : "s"} · ${formatMoney(totals?.paid)} pagado` : "Cargando…"}
                                        </CardDescription>
                                    </div>
                                    <Button className="lg:hidden" size="sm" onClick={() => setAddOpen(true)}>
                                        <Plus /> Nuevo gasto
                                    </Button>
                                </CardHeader>

                                {expenses.length > 0 && (
                                    <div className="flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-center sm:px-6">
                                        <Segmented
                                            label="Filtrar gastos"
                                            value={filter}
                                            onChange={setFilter}
                                            options={[
                                                { value: "all", label: "Todos", count: expenses.length },
                                                { value: "pending", label: "Pendientes", count: pendingCount },
                                                { value: "paid", label: "Pagados", count: paidCount },
                                            ]}
                                        />
                                        <div className="relative flex-1">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                placeholder="Buscar gasto o categoría"
                                                className="h-10 pl-9"
                                                aria-label="Buscar gastos"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className={loading && data ? "opacity-60 transition-opacity" : "transition-opacity"}>
                                    {firstLoad ? (
                                        <ExpenseListSkeleton />
                                    ) : expenses.length === 0 ? (
                                        <div className="p-5 sm:p-6">
                                            <EmptyState
                                                icon={<Sparkles />}
                                                title={relative === "future" ? "Aún no hay gastos programados" : "Sin gastos registrados este mes"}
                                                description={
                                                    relative === "future"
                                                        ? "Registra un gasto con una fecha de este mes y aparecerá aquí."
                                                        : "Registra tus gastos variables o configura tus gastos fijos para que se agreguen cada mes."
                                                }
                                                action={
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        <Button onClick={() => setAddOpen(true)}>
                                                            <Plus /> Registrar gasto
                                                        </Button>
                                                        <Button variant="outline" href="/user/expenses">
                                                            <Repeat /> Gastos fijos
                                                        </Button>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    ) : visible.length === 0 ? (
                                        <p className="px-6 py-10 text-center text-sm text-muted-foreground">No hay gastos que coincidan con el filtro.</p>
                                    ) : (
                                        <ul className="mt-3 divide-y border-t stagger">
                                            {visible.map((expense) => (
                                                <ExpenseItem
                                                    key={expense.id}
                                                    expense={expense}
                                                    today={data!.today}
                                                    busy={busyIds.has(expense.id)}
                                                    onTogglePaid={relative === "future" ? undefined : togglePaid}
                                                    onEdit={setEditing}
                                                    onDelete={setDeleting}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </Card>

                            {relative === "future" && data && data.projectedIncomes.length > 0 && (
                                <Card className="animate-fade-up">
                                    <CardHeader>
                                        <CardTitle>Ingresos recurrentes proyectados</CardTitle>
                                        <CardDescription>Se registrarán automáticamente en {label}.</CardDescription>
                                    </CardHeader>
                                    <ul className="mt-4 divide-y border-t">
                                        {data.projectedIncomes.map((item) => (
                                            <li key={item.recurring_income_id} className="flex items-center gap-4 px-5 py-3.5 opacity-80 sm:px-6">
                                                <span className="flex size-10 items-center justify-center rounded-xl bg-success/12 text-success">
                                                    <Repeat className="size-[18px]" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">{item.description}</p>
                                                    <p className="text-xs text-muted-foreground">{formatDateShort(item.income_date)}</p>
                                                </div>
                                                <p className="font-semibold tabular text-success">+ {formatMoney(item.amount)}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            )}

                            {relative === "future" && data && data.projected.length > 0 && (
                                <Card className="animate-fade-up">
                                    <CardHeader>
                                        <CardTitle>Gastos fijos proyectados</CardTitle>
                                        <CardDescription>Se registrarán automáticamente cuando llegue {label}.</CardDescription>
                                    </CardHeader>
                                    <ul className="mt-4 divide-y border-t">
                                        {data.projected.map((item) => (
                                            <li key={item.expense_id} className="flex items-center gap-4 px-5 py-3.5 opacity-80 sm:px-6">
                                                <CategoryIcon name={item.category_name} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.category_name} · {formatDateShort(item.expense_date)}
                                                        {item.installment_number && item.installments_total ? ` · Cuota ${item.installment_number}/${item.installments_total}` : ""}
                                                    </p>
                                                </div>
                                                <p className="font-semibold tabular text-muted-foreground">{formatMoney(item.amount)}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            )}

                            {relative === "current" && data && data.upcoming.length > 0 && (
                                <Card className="animate-fade-up">
                                    <CardHeader className="flex-row items-center gap-3">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-info/14 text-info">
                                            <CalendarClock className="size-[18px]" />
                                        </span>
                                        <div>
                                            <CardTitle>Próximos gastos</CardTitle>
                                            <CardDescription>Registrados con fecha futura · {formatMoney(data.totals.upcoming)}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <ul className="mt-4 divide-y border-t">
                                        {data.upcoming.map((expense) => (
                                            <ExpenseItem
                                                key={expense.id}
                                                expense={expense}
                                                today={data.today}
                                                variant="upcoming"
                                                onEdit={setEditing}
                                                onDelete={setDeleting}
                                            />
                                        ))}
                                    </ul>
                                </Card>
                            )}
                        </div>

                        {/* Columna lateral */}
                        <aside className="space-y-6">
                            <Card className="hidden overflow-hidden lg:block">
                                <div className="bg-brand-gradient px-6 py-5 text-white">
                                    <p className="flex items-center gap-2 text-sm font-medium text-white/85">
                                        <Plus className="size-4" /> Gasto variable
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">Registra un gasto</p>
                                    <p className="text-sm text-white/80">Si eliges una fecha futura, se guarda en ese mes.</p>
                                </div>
                                <CardContent>
                                    <ExpenseForm kind="variable" onSubmit={createVariable} compact idPrefix="dash" />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>¿En qué se va tu dinero?</CardTitle>
                                    <CardDescription>Distribución de los gastos de {label}.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {firstLoad ? (
                                        <div className="space-y-4">
                                            {[0, 1, 2].map((i) => (
                                                <Skeleton key={i} className="h-8" />
                                            ))}
                                        </div>
                                    ) : (
                                        <CategoryBreakdown items={expenses} />
                                    )}
                                </CardContent>
                            </Card>

                            {data && data.budgets.length > 0 && (
                                <Card className="animate-fade-up">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Presupuestos</CardTitle>
                                            <CardDescription>Uso en {label}</CardDescription>
                                        </div>
                                        <Link href="/user/budgets" className="text-xs font-medium text-primary hover:underline">
                                            Ajustar
                                        </Link>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {[...data.budgets]
                                            .sort((a, b) => b.spent / (b.budget || 1) - a.spent / (a.budget || 1))
                                            .slice(0, 5)
                                            .map((b) => (
                                                <BudgetBar key={b.category_id} name={b.category_name} budget={b.budget ?? 0} spent={b.spent} />
                                            ))}
                                    </CardContent>
                                </Card>
                            )}

                            {data && data.accounts.length > 0 && (
                                <Card className="animate-fade-up">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Tus cuentas</CardTitle>
                                            <CardDescription>Saldo actual</CardDescription>
                                        </div>
                                        <Link href="/user/accounts" className="text-xs font-medium text-primary hover:underline">
                                            Ver movimientos
                                        </Link>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {data.accounts.map((account) => (
                                            <div key={account.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
                                                <span className="font-medium">{account.bank_name}</span>
                                                <span className={(account.balance ?? 0) < 0 ? "font-semibold tabular text-destructive" : "font-semibold tabular"}>{formatMoney(account.balance)}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {data && data.goals.length > 0 && (
                                <Card className="animate-fade-up">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Metas de ahorro</CardTitle>
                                            <CardDescription>
                                                {totals && totals.savings > 0 ? `${formatMoney(totals.savings)} ahorrados este mes` : "Aún no ahorras este mes"}
                                            </CardDescription>
                                        </div>
                                        <Link href="/user/savings" className="text-xs font-medium text-primary hover:underline">
                                            Ahorrar
                                        </Link>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {data.goals.slice(0, 3).map((goal) => {
                                            const share = Math.min(100, Math.round((goal.saved / (goal.target_amount || 1)) * 100));
                                            return (
                                                <div key={goal.id} className="flex items-center gap-3">
                                                    <ProgressRing value={share} size={44} stroke={5}>
                                                        <span className="text-[10px] font-semibold tabular">{share}%</span>
                                                    </ProgressRing>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{goal.name}</p>
                                                        <p className="text-xs text-muted-foreground tabular">
                                                            {formatMoney(goal.saved)} de {formatMoney(goal.target_amount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardContent className="grid gap-2">
                                    <Button variant="soft" href="/user/incomes" className="justify-between">
                                        <span className="flex items-center gap-2">
                                            <Wallet /> Registrar un ingreso
                                        </span>
                                        <ArrowUpRight />
                                    </Button>
                                    <Button variant="soft" href="/user/expenses" className="justify-between">
                                        <span className="flex items-center gap-2">
                                            <Repeat /> Administrar gastos fijos
                                        </span>
                                        <ArrowUpRight />
                                    </Button>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                </>
            )}

            {/* Botón flotante (móvil) */}
            <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="fixed bottom-24 right-5 z-30 flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lift transition active:scale-95 lg:hidden animate-pop"
                aria-label="Registrar gasto"
            >
                <Plus className="size-6" />
            </button>

            <Dialog
                open={addOpen}
                onOpenChange={setAddOpen}
                title="Registrar gasto variable"
                description="Si la fecha es posterior a hoy, el gasto quedará registrado en el mes de esa fecha."
                icon={<Plus className="size-5" />}
            >
                <ExpenseForm kind="variable" onSubmit={createVariable} onCancel={() => setAddOpen(false)} idPrefix="dlg" />
            </Dialog>

            <Dialog
                open={Boolean(editing)}
                onOpenChange={(open) => !open && setEditing(null)}
                title="Editar gasto"
                description={editing ? `${editing.name} · ${editing.month_name} ${editing.year}` : undefined}
            >
                {editing && <PeriodExpenseForm key={editing.id} expense={editing} onSubmit={saveEdit} onCancel={() => setEditing(null)} />}
            </Dialog>

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="¿Eliminar este gasto?"
                description={
                    deleting
                        ? `Se eliminará "${deleting.name}" (${formatMoney(deleting.amount)}) de ${deleting.month_name} ${deleting.year}. ${
                              Number(deleting.category_type) === 1 ? "El gasto fijo seguirá generándose en los próximos meses." : "Esta acción no se puede deshacer."
                          }`
                        : undefined
                }
                confirmLabel="Eliminar"
                onConfirm={confirmDelete}
            />
        </AppShell>
    );
}
