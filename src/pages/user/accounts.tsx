import * as React from "react";
import { ArrowLeftRight, ArrowDownRight, ArrowUpRight, Landmark, PiggyBank, Plus, Receipt, SlidersHorizontal, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { SelectField } from "@/components/ui/category-select";
import { useToast } from "@/components/ui/toast";
import { BankAccountForm } from "@/components/forms/BankAccountForm";
import { AnimatedMoney } from "@/components/finance/AnimatedNumber";
import { useToday } from "@/contexts/TodayContext";
import { useAccounts } from "@/hooks/useAccounts";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateLong } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { cn } from "@/lib/utils";
import type { AccountTransaction, BankAccount, BankAccountInput } from "@/types";

export const getServerSideProps = withPageAuth("user");

const KIND: Record<AccountTransaction["kind"], { label: string; icon: React.ElementType; tone: string }> = {
    income: { label: "Ingreso", icon: ArrowDownRight, tone: "bg-success/12 text-success" },
    expense: { label: "Pago", icon: Receipt, tone: "bg-destructive/10 text-destructive" },
    saving: { label: "Ahorro", icon: PiggyBank, tone: "bg-chart-4/14 text-chart-4" },
    adjustment: { label: "Ajuste", icon: SlidersHorizontal, tone: "bg-muted text-muted-foreground" },
    transfer: { label: "Transferencia", icon: ArrowLeftRight, tone: "bg-info/14 text-info" },
};

function MovementForm({ accounts, initialAccount, onDone, onCancel }: { accounts: BankAccount[]; initialAccount: number; onDone: () => Promise<void>; onCancel: () => void }) {
    const today = useToday();
    const [type, setType] = React.useState<"transfer" | "in" | "out">(accounts.length > 1 ? "transfer" : "in");
    const [from, setFrom] = React.useState(String(initialAccount));
    const [to, setTo] = React.useState(String(accounts.find((a) => a.id !== initialAccount)?.id ?? ""));
    const [amount, setAmount] = React.useState<number | null>(null);
    const [date, setDate] = React.useState(today);
    const [description, setDescription] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);
    const options = accounts.map((a) => ({ value: String(a.id), label: a.bank_name, description: `Saldo ${formatMoney(a.balance)}` }));

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!amount) return setError("Indica un valor mayor a cero.");
        if (type === "transfer" && from === to) return setError("Elige dos cuentas diferentes.");
        setBusy(true);
        setError(null);
        try {
            await api("/api/accounts", {
                method: "POST",
                body: {
                    accountId: Number(from),
                    toAccountId: type === "transfer" ? Number(to) : null,
                    amount: type === "out" ? -amount : amount,
                    date,
                    description,
                },
            });
            await onDone();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Segmented
                label="Tipo de movimiento"
                value={type}
                onChange={setType}
                className="w-full [&>button]:flex-1"
                options={[
                    ...(accounts.length > 1 ? [{ value: "transfer" as const, label: "Transferir" }] : []),
                    { value: "in" as const, label: "Entrada" },
                    { value: "out" as const, label: "Salida" },
                ]}
            />
            <div className={cn("grid gap-4", type === "transfer" && "sm:grid-cols-2")}>
                <Field label={type === "transfer" ? "Desde" : "Cuenta"} htmlFor="mv-from">
                    <SelectField id="mv-from" value={from} onValueChange={setFrom} options={options} />
                </Field>
                {type === "transfer" && (
                    <Field label="Hacia" htmlFor="mv-to">
                        <SelectField id="mv-to" value={to} onValueChange={setTo} options={options.filter((o) => o.value !== from)} />
                    </Field>
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor" htmlFor="mv-amount" required>
                    <MoneyInput id="mv-amount" value={amount} onValueChange={setAmount} placeholder="0" />
                </Field>
                <Field label="Fecha" htmlFor="mv-date" required>
                    <Input id="mv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
            </div>
            <Field label="Descripción" htmlFor="mv-desc" optional hint={type !== "transfer" ? "Úsalo para intereses, retiros en efectivo o corregir el saldo." : undefined}>
                <Input id="mv-desc" value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <FormError message={error} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" loading={busy}>
                    Registrar movimiento
                </Button>
            </div>
        </form>
    );
}

export default function Accounts() {
    const toast = useToast();
    const { accounts, loading, reload } = useAccounts();
    const [selected, setSelected] = React.useState<number | null>(null);
    const [transactions, setTransactions] = React.useState<AccountTransaction[] | null>(null);
    const [creating, setCreating] = React.useState(false);
    const [moving, setMoving] = React.useState(false);
    const [opening, setOpening] = React.useState<{ account: BankAccount; value: number | null } | null>(null);

    const activeId = selected ?? accounts[0]?.id ?? null;
    const active = accounts.find((a) => a.id === activeId) ?? null;

    const loadTransactions = React.useCallback(
        async (id: number) => {
            setTransactions(null);
            try {
                const data = await api<{ transactions: AccountTransaction[] }>(`/api/accounts?accountId=${id}`);
                setTransactions(data.transactions);
            } catch (error) {
                toast.error("No se pudieron cargar los movimientos", errorMessage(error));
                setTransactions([]);
            }
        },
        [toast]
    );

    React.useEffect(() => {
        if (activeId) loadTransactions(activeId);
    }, [activeId, loadTransactions]);

    async function refresh() {
        await reload();
        if (activeId) await loadTransactions(activeId);
    }

    async function createAccount(values: BankAccountInput & { last4?: string }) {
        await api("/api/bankAccount", { method: "POST", body: { bankAccount: values } });
        toast.success("Cuenta agregada", values.bank_name);
        setCreating(false);
        await reload();
    }

    async function saveOpening() {
        if (!opening) return;
        try {
            await api("/api/accounts", { method: "PUT", body: { id: opening.account.id, opening_balance: opening.value ?? 0 } });
            toast.success("Saldo inicial actualizado");
            setOpening(null);
            await refresh();
        } catch (error) {
            toast.error("No se pudo actualizar", errorMessage(error));
        }
    }

    async function deleteMovement(tx: AccountTransaction) {
        try {
            await api("/api/accounts", { method: "DELETE", body: { transactionId: tx.id } });
            toast.success("Movimiento eliminado");
            await refresh();
        } catch (error) {
            toast.error("No se pudo eliminar", errorMessage(error));
        }
    }

    const total = accounts.reduce((acc, a) => acc + (a.balance ?? 0), 0);

    return (
        <AppShell title="Cuentas">
            <PageHeader
                eyebrow="Cuentas"
                title="¿Dónde está tu dinero?"
                description="El saldo se actualiza solo: suma tus ingresos y resta los pagos y ahorros que registras desde cada cuenta."
                actions={
                    <>
                        {accounts.length > 0 && (
                            <Button variant="outline" onClick={() => setMoving(true)}>
                                <ArrowLeftRight /> Movimiento
                            </Button>
                        )}
                        <Button onClick={() => setCreating(true)}>
                            <Plus /> Nueva cuenta
                        </Button>
                    </>
                }
            />

            {loading ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1].map((i) => (
                        <Skeleton key={i} className="h-40 rounded-3xl" />
                    ))}
                </div>
            ) : accounts.length === 0 ? (
                <div className="mt-6">
                    <EmptyState
                        icon={<Landmark />}
                        title="Agrega tu primera cuenta"
                        description="Registra tu cuenta de ahorros, Nequi o efectivo con su saldo actual y lleva el control de cuánto tienes en cada una."
                        action={
                            <Button onClick={() => setCreating(true)}>
                                <Plus /> Agregar cuenta
                            </Button>
                        }
                    />
                </div>
            ) : (
                <>
                    <div className="mt-6 rounded-3xl bg-brand-gradient p-6 text-white shadow-lift animate-fade-up">
                        <p className="text-sm text-white/80">Saldo total en tus cuentas</p>
                        <AnimatedMoney value={total} className="mt-1 block text-3xl font-semibold tabular sm:text-4xl" />
                        <p className="mt-1 text-xs text-white/75">
                            {accounts.length} cuenta{accounts.length === 1 ? "" : "s"}
                        </p>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
                        {accounts.map((account, index) => (
                            <button
                                key={account.id}
                                type="button"
                                onClick={() => setSelected(account.id)}
                                className={cn(
                                    "rounded-3xl border bg-card p-5 text-left shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift",
                                    account.id === activeId && "border-primary ring-2 ring-primary/20"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Landmark className="size-5" />
                                    </span>
                                    {index === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Principal</span>}
                                </div>
                                <p className="mt-4 font-semibold">{account.bank_name}</p>
                                <p className="text-xs text-muted-foreground">{Number(account.account_type) === 1 ? "Ahorros" : "Corriente"}</p>
                                <p className={cn("mt-2 text-2xl font-semibold tabular", (account.balance ?? 0) < 0 && "text-destructive")}>{formatMoney(account.balance)}</p>
                            </button>
                        ))}
                    </div>

                    {active && (
                        <Card className="mt-6 overflow-hidden">
                            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <CardTitle>Movimientos de {active.bank_name}</CardTitle>
                                    <CardDescription>
                                        Saldo inicial {formatMoney(active.account_balance)} ·{" "}
                                        <button type="button" className="font-medium text-primary hover:underline" onClick={() => setOpening({ account: active, value: active.account_balance })}>
                                            cambiar
                                        </button>
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {!transactions ? (
                                    <div className="space-y-2">
                                        {[0, 1, 2].map((i) => (
                                            <Skeleton key={i} className="h-12 rounded-xl" />
                                        ))}
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <EmptyState
                                        icon={<Wallet />}
                                        title="Sin movimientos todavía"
                                        description="Cuando registres ingresos o marques pagos desde esta cuenta, aparecerán aquí."
                                    />
                                ) : (
                                    <ul className="divide-y rounded-2xl border">
                                        {transactions.map((tx) => {
                                            const kind = KIND[tx.kind] ?? KIND.adjustment;
                                            const Icon = kind.icon;
                                            const manual = tx.kind === "adjustment" || tx.kind === "transfer";
                                            return (
                                                <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                                                    <span className={cn("flex size-9 items-center justify-center rounded-xl", kind.tone)}>
                                                        <Icon className="size-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{tx.description || kind.label}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {kind.label} · {formatDateLong(tx.transaction_date)}
                                                        </p>
                                                    </div>
                                                    <p className={cn("font-semibold tabular", tx.amount >= 0 ? "text-success" : "")}>
                                                        {tx.amount >= 0 ? <ArrowUpRight className="mr-0.5 inline size-3.5" /> : null}
                                                        {tx.amount >= 0 ? "+" : "−"}
                                                        {formatMoney(Math.abs(tx.amount))}
                                                    </p>
                                                    {manual ? (
                                                        <button type="button" onClick={() => deleteMovement(tx)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar movimiento">
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    ) : (
                                                        <span className="w-7" />
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            <Dialog open={creating} onOpenChange={setCreating} title="Nueva cuenta" icon={<Landmark className="size-5" />}>
                <BankAccountForm onSubmit={createAccount} onCancel={() => setCreating(false)} withOpeningBalance />
            </Dialog>
            <Dialog open={moving} onOpenChange={setMoving} title="Registrar movimiento" icon={<ArrowLeftRight className="size-5" />}>
                {moving && accounts.length > 0 && (
                    <MovementForm
                        accounts={accounts}
                        initialAccount={activeId ?? accounts[0].id}
                        onCancel={() => setMoving(false)}
                        onDone={async () => {
                            setMoving(false);
                            toast.success("Movimiento registrado");
                            await refresh();
                        }}
                    />
                )}
            </Dialog>
            <Dialog open={Boolean(opening)} onOpenChange={(open) => !open && setOpening(null)} title="Saldo inicial" description="El saldo con el que empezaste a controlar esta cuenta en MizCuentas.">
                {opening && (
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveOpening();
                        }}
                    >
                        <MoneyInput value={opening.value} onValueChange={(value) => setOpening({ ...opening, value })} placeholder="0" autoFocus />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpening(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit">Guardar</Button>
                        </div>
                    </form>
                )}
            </Dialog>
        </AppShell>
    );
}
