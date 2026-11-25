import * as React from "react";
import { useRouter } from "next/router";
import { ArrowLeft, ArrowRight, Check, Landmark, PartyPopper, Repeat, Rocket, Sparkles, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/buttons";
import { Card, CardContent } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { BankAccountForm } from "@/components/forms/BankAccountForm";
import { IncomeForm, type IncomeFormValues } from "@/components/forms/IncomeForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { Confetti } from "@/components/feedback/Confetti";
import { PageLoader } from "@/components/feedback/Loaders";
import { LogoMark } from "@/components/brand/Logo";
import { useUser } from "@/contexts/UserContext";
import { api, errorMessage } from "@/lib/client/api";
import { formatMoney } from "@/lib/format";
import { withPageAuth, type AuthedPageProps } from "@/lib/ssr";
import { cn } from "@/lib/utils";
import type { BankAccount, Expense, ExpenseInput, Income } from "@/types";

export const getServerSideProps = withPageAuth("onboarding");

const STEPS = [
    { key: "welcome", label: "Bienvenida", icon: Sparkles },
    { key: "bank", label: "Cuenta", icon: Landmark },
    { key: "income", label: "Ingreso", icon: Wallet },
    { key: "fixed", label: "Gastos fijos", icon: Repeat },
    { key: "done", label: "Listo", icon: Rocket },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type OnboardingState = { incomes: Income[]; bankAccounts: BankAccount[]; expenses: Expense[] };

/**
 * Onboarding guiado: progreso visible, se puede volver atrás, omitir pasos opcionales
 * y retomar donde se quedó (el estado se lee del servidor).
 */
export default function Onboarding({ user }: AuthedPageProps) {
    const router = useRouter();
    const toast = useToast();
    const { setUser } = useUser();
    const [step, setStep] = React.useState<StepKey>("welcome");
    const [state, setState] = React.useState<OnboardingState | null>(null);
    const [finishing, setFinishing] = React.useState(false);
    const [confetti, setConfetti] = React.useState(0);
    const index = STEPS.findIndex((s) => s.key === step);

    const refresh = React.useCallback(async () => {
        const data = await api<{ onboarding: OnboardingState }>("/api/onBoarding");
        setState(data.onboarding);
        return data.onboarding;
    }, []);

    React.useEffect(() => {
        refresh()
            .then((data) => {
                // Retoma el proceso en el primer paso pendiente.
                if (data.expenses.length > 0) setStep("fixed");
                else if (data.incomes.length > 0) setStep("fixed");
                else if (data.bankAccounts.length > 0) setStep("income");
            })
            .catch((error) => toast.error("No pudimos cargar tu progreso", errorMessage(error)));
    }, [refresh, toast]);

    React.useEffect(() => {
        if (step === "done") setConfetti((n) => n + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [step]);

    const go = (key: StepKey) => setStep(key);
    const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)].key);
    const back = () => setStep(STEPS[Math.max(index - 1, 0)].key);

    async function saveBank(values: { bank_name: string; account_type: number; last4?: string; opening_balance?: number }) {
        await api("/api/bankAccount", { method: "POST", body: { bankAccount: values } });
        toast.success("Cuenta guardada", values.bank_name);
        await refresh();
        next();
    }

    async function saveIncome(values: IncomeFormValues) {
        if (values.recurring) {
            await api("/api/recurringIncomes", {
                method: "POST",
                body: { recurringIncome: { description: values.description || "Salario", amount: values.amount, start_date: values.income_date, bank_account_id: values.bank_account_id } },
            });
            toast.success("Ingreso mensual configurado", `${formatMoney(values.amount)} se registrará solo cada mes.`);
        } else {
            await api("/api/incomes", { method: "POST", body: { income: values } });
            toast.success("Ingreso registrado", formatMoney(values.amount));
        }
        await refresh();
        next();
    }

    async function saveFixed(values: ExpenseInput) {
        await api("/api/periodExpenses", { method: "POST", body: { kind: "fixed", expense: values } });
        toast.success("Gasto fijo agregado", `${values.name} · ${formatMoney(values.amount)}`);
        await refresh();
    }

    async function finish() {
        setFinishing(true);
        try {
            const data = await api<{ redirectTo: string }>("/api/onBoarding", { method: "POST" });
            setUser({ ...user, needsOnboarding: false });
            await router.push(data.redirectTo);
        } catch (error) {
            toast.error("No pudimos finalizar", errorMessage(error));
            setFinishing(false);
        }
    }

    const totalIncome = state?.incomes.reduce((acc, i) => acc + Number(i.amount), 0) ?? 0;
    const totalFixed = state?.expenses.reduce((acc, e) => acc + Number(e.amount), 0) ?? 0;
    const firstName = user.name.split(" ")[0];

    if (finishing) {
        return (
            <AppShell title="Preparando tu tablero" minimal>
                <PageLoader label="Preparando tu tablero…" className="min-h-[60vh]" />
            </AppShell>
        );
    }

    return (
        <AppShell title="Configuración inicial" minimal className="max-w-3xl">
            <Confetti burstKey={confetti} count={48} />

            {/* Progreso */}
            <nav aria-label="Progreso de configuración" className="mb-8">
                <ol className="flex items-center">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const completed = i < index;
                        const active = i === index;
                        return (
                            <li key={s.key} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
                                <button
                                    type="button"
                                    onClick={() => i < index && go(s.key)}
                                    disabled={i >= index}
                                    className="group flex flex-col items-center gap-1.5"
                                    aria-current={active ? "step" : undefined}
                                >
                                    <span
                                        className={cn(
                                            "flex size-10 items-center justify-center rounded-2xl border-2 transition-all duration-500",
                                            completed && "border-primary bg-primary text-primary-foreground",
                                            active && "scale-110 border-primary bg-primary/10 text-primary shadow-[0_0_0_6px_color-mix(in_oklch,var(--primary)_12%,transparent)]",
                                            !completed && !active && "border-border text-muted-foreground"
                                        )}
                                    >
                                        {completed ? <Check className="size-5 animate-pop" /> : <Icon className="size-[18px]" />}
                                    </span>
                                    <span className={cn("hidden text-xs font-medium sm:block", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                                </button>
                                {i < STEPS.length - 1 && (
                                    <span className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-border sm:mb-5">
                                        <span className="block h-full bg-primary transition-[width] duration-700 ease-out" style={{ width: completed ? "100%" : "0%" }} />
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>

            <div key={step} className="animate-fade-up">
                {step === "welcome" && (
                    <Card className="overflow-hidden">
                        <div className="relative bg-brand-gradient px-6 py-10 text-center text-white sm:px-10">
                            <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
                            <LogoMark size={72} className="relative mx-auto drop-shadow-xl animate-float" />
                            <h1 className="relative mt-6 text-3xl font-semibold tracking-tight">¡Hola, {firstName}! Bienvenido a MizCuentas</h1>
                            <p className="relative mx-auto mt-2 max-w-md text-white/85">Vamos a dejar tu presupuesto listo en 3 pasos cortos. Puedes omitir lo que quieras y completarlo después.</p>
                        </div>
                        <CardContent className="space-y-6">
                            <ul className="grid gap-3 sm:grid-cols-3 stagger">
                                {[
                                    { icon: Landmark, title: "Tu cuenta", text: "Dónde recibes tu dinero" },
                                    { icon: Wallet, title: "Tu ingreso", text: "Cuánto recibes al mes" },
                                    { icon: Repeat, title: "Gastos fijos", text: "Lo que pagas cada mes" },
                                ].map(({ icon: Icon, title, text }) => (
                                    <li key={title} className="rounded-2xl border p-4">
                                        <Icon className="size-5 text-primary" />
                                        <p className="mt-2 font-medium">{title}</p>
                                        <p className="text-sm text-muted-foreground">{text}</p>
                                    </li>
                                ))}
                            </ul>
                            <Button size="lg" block onClick={next}>
                                Empezar <ArrowRight />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === "bank" && (
                    <StepCard
                        icon={<Landmark />}
                        title="¿Dónde recibes tu dinero?"
                        description="Registra tu cuenta principal. Solo el nombre del banco y el tipo: nada de números completos ni claves."
                        onBack={back}
                        onSkip={next}
                        done={state ? state.bankAccounts.length > 0 : false}
                        doneLabel={state?.bankAccounts.map((b) => b.bank_name).join(", ")}
                        onContinue={next}
                    >
                        <BankAccountForm onSubmit={saveBank} submitLabel="Guardar y continuar" withOpeningBalance />
                    </StepCard>
                )}

                {step === "income" && (
                    <StepCard
                        icon={<Wallet />}
                        title="¿Cuánto recibes este mes?"
                        description="Tu salario u otro ingreso principal. Con esto calculamos tu dinero disponible."
                        onBack={back}
                        onSkip={next}
                        done={state ? state.incomes.length > 0 : false}
                        doneLabel={totalIncome ? `${formatMoney(totalIncome)} registrados` : undefined}
                        onContinue={next}
                    >
                        <IncomeForm onSubmit={saveIncome} submitLabel="Guardar y continuar" idPrefix="ob-income" allowRecurring defaultRecurring />
                    </StepCard>
                )}

                {step === "fixed" && (
                    <StepCard
                        icon={<Repeat />}
                        title="Tus gastos fijos"
                        description="Arriendo, servicios, internet, créditos… Agrega todos los que quieras: se registrarán solos cada mes."
                        onBack={back}
                    >
                        <div className="grid gap-6 md:grid-cols-[1fr_0.9fr]">
                            <ExpenseForm kind="fixed" onSubmit={saveFixed} compact idPrefix="ob-fixed" />
                            <div className="rounded-2xl border bg-muted/30 p-4">
                                <div className="flex items-baseline justify-between">
                                    <p className="text-sm font-semibold">Agregados</p>
                                    <p className="text-sm font-medium tabular">{formatMoney(totalFixed)}/mes</p>
                                </div>
                                {state && state.expenses.length > 0 ? (
                                    <ul className="mt-3 space-y-2 stagger">
                                        {state.expenses.map((expense) => (
                                            <li key={expense.id} className="flex items-center gap-3 rounded-xl bg-card p-2.5 shadow-soft">
                                                <CategoryIcon name={expense.category_name} size="sm" />
                                                <span className="min-w-0 flex-1 truncate text-sm font-medium">{expense.name}</span>
                                                <span className="text-sm tabular">{formatMoney(expense.amount)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-6 text-center text-sm text-muted-foreground">Aún no agregas gastos fijos. ¡Empieza por el arriendo o los servicios!</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
                            <Button variant="ghost" onClick={back}>
                                <ArrowLeft /> Atrás
                            </Button>
                            <Button onClick={next}>
                                {state && state.expenses.length > 0 ? "Continuar" : "Omitir por ahora"} <ArrowRight />
                            </Button>
                        </div>
                    </StepCard>
                )}

                {step === "done" && (
                    <Card className="overflow-hidden text-center">
                        <CardContent className="space-y-6 py-10">
                            <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-success/14 text-success animate-pop">
                                <PartyPopper className="size-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold tracking-tight">¡Todo listo, {firstName}!</h2>
                                <p className="mx-auto max-w-md text-muted-foreground">Tu tablero ya está preparado. Así arranca tu mes:</p>
                            </div>
                            <div className="mx-auto grid max-w-lg gap-3 sm:grid-cols-3 stagger">
                                <SummaryTile label="Ingresos" value={formatMoney(totalIncome)} tone="text-success" />
                                <SummaryTile label="Gastos fijos" value={formatMoney(totalFixed)} tone="text-primary" />
                                <SummaryTile
                                    label="Disponible"
                                    value={formatMoney(totalIncome - totalFixed)}
                                    tone={totalIncome - totalFixed >= 0 ? "text-info" : "text-destructive"}
                                />
                            </div>
                            <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
                                <Button variant="ghost" onClick={back}>
                                    <ArrowLeft /> Revisar
                                </Button>
                                <Button size="lg" onClick={finish}>
                                    Ir a mi tablero <ArrowRight />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: string }) {
    return (
        <div className="rounded-2xl border p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("mt-1 font-semibold tabular", tone)}>{value}</p>
        </div>
    );
}

function StepCard({
    icon,
    title,
    description,
    children,
    onBack,
    onSkip,
    onContinue,
    done,
    doneLabel,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
    onBack?: () => void;
    onSkip?: () => void;
    onContinue?: () => void;
    done?: boolean;
    doneLabel?: string;
}) {
    return (
        <Card>
            <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-6">{icon}</span>
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>

                {done && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-success/30 bg-success/8 p-4 sm:flex-row sm:items-center sm:justify-between animate-scale-in">
                        <p className="flex items-center gap-2 text-sm">
                            <Check className="size-4 text-success" /> Ya registraste: <strong className="font-semibold">{doneLabel}</strong>
                        </p>
                        {onContinue && (
                            <Button size="sm" onClick={onContinue}>
                                Continuar <ArrowRight />
                            </Button>
                        )}
                    </div>
                )}

                {children}

                {(onBack || onSkip) && onSkip && (
                    <div className="flex items-center justify-between border-t pt-4">
                        {onBack ? (
                            <Button variant="ghost" size="sm" onClick={onBack}>
                                <ArrowLeft /> Atrás
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Button variant="link" size="sm" onClick={onSkip}>
                            Omitir este paso
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
