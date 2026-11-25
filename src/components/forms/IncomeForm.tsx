import * as React from "react";
import { Plus, Repeat, Save } from "lucide-react";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { AccountSelect, accountValue, NO_ACCOUNT } from "@/components/finance/AccountSelect";
import { useAccounts } from "@/hooks/useAccounts";
import { errorMessage } from "@/lib/client/api";
import { monthLabel, parseISODate } from "@/lib/dates";
import { useToday } from "@/contexts/TodayContext";
import type { IncomeInput } from "@/types";

const SUGGESTIONS = ["Salario", "Honorarios", "Prima", "Venta", "Arriendo recibido", "Bonificación"];

export type IncomeFormValues = IncomeInput & { recurring: boolean };

type Props = {
    initial?: Partial<IncomeInput> | null;
    onSubmit: (values: IncomeFormValues) => Promise<void>;
    /** Muestra la opción "Repetir cada mes" (solo al crear). */
    allowRecurring?: boolean;
    defaultRecurring?: boolean;
    /** Oculta el selector de cuenta (p. ej. el administrador editando ingresos ajenos). */
    showAccount?: boolean;
    onCancel?: () => void;
    submitLabel?: string;
    idPrefix?: string;
};

export function IncomeForm({ initial, onSubmit, onCancel, submitLabel, idPrefix = "income", allowRecurring = false, defaultRecurring = false, showAccount = true }: Props) {
    const today = useToday();
    const { accounts, loading: loadingAccounts } = useAccounts();
    const [account, setAccount] = React.useState(initial?.bank_account_id === null ? NO_ACCOUNT : initial?.bank_account_id ? String(initial.bank_account_id) : "");
    const [recurring, setRecurring] = React.useState(defaultRecurring);
    const [amount, setAmount] = React.useState<number | null>(initial?.amount ?? null);
    const [date, setDate] = React.useState(initial?.income_date?.slice(0, 10) || today);
    const [description, setDescription] = React.useState(initial?.description ?? "");
    const [errors, setErrors] = React.useState<{ amount?: string; date?: string }>({});
    const [formError, setFormError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const amountRef = React.useRef<HTMLInputElement>(null);
    const isEdit = Boolean(initial);
    const parts = parseISODate(date);
    // Por defecto la cuenta principal; si no tiene cuentas, "Sin cuenta".
    const selectedAccount = account || (accounts[0] ? String(accounts[0].id) : NO_ACCOUNT);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);
        const next: typeof errors = {};
        if (!amount || amount <= 0) next.amount = "El valor debe ser mayor a cero.";
        if (!parts) next.date = "Elige una fecha válida.";
        setErrors(next);
        if (Object.keys(next).length) return;

        setSubmitting(true);
        try {
            await onSubmit({
                amount: amount!,
                income_date: date,
                description: description.trim(),
                bank_account_id: !showAccount || (loadingAccounts && !account) ? undefined : accountValue(selectedAccount),
                recurring: allowRecurring && !isEdit && recurring,
            });
            if (!isEdit) {
                setAmount(null);
                setDescription("");
                amountRef.current?.focus();
            }
        } catch (error) {
            setFormError(errorMessage(error, "No fue posible guardar el ingreso."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="Valor recibido" htmlFor={`${idPrefix}-amount`} required error={errors.amount}>
                <MoneyInput
                    ref={amountRef}
                    id={`${idPrefix}-amount`}
                    value={amount}
                    placeholder="0"
                    onValueChange={(value) => {
                        setAmount(value);
                        if (errors.amount) setErrors((e) => ({ ...e, amount: undefined }));
                    }}
                    aria-invalid={Boolean(errors.amount) || undefined}
                />
            </Field>

            <Field
                label="Fecha"
                htmlFor={`${idPrefix}-date`}
                required
                error={errors.date}
                hint={parts ? `Suma a los ingresos de ${monthLabel(parts)}.` : undefined}
            >
                <Input id={`${idPrefix}-date`} type="date" value={date} min="2000-01-01" max="2100-12-31" onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Field label="Descripción" htmlFor={`${idPrefix}-description`} optional>
                <Input
                    id={`${idPrefix}-description`}
                    value={description}
                    maxLength={255}
                    placeholder="Ej: Salario mensual"
                    onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => setDescription(suggestion)}
                            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </Field>

            {showAccount && (accounts.length > 0 || loadingAccounts) && (
                <Field label="Cuenta donde lo recibes" htmlFor={`${idPrefix}-account`} hint="El ingreso se suma al saldo de esa cuenta.">
                    <AccountSelect id={`${idPrefix}-account`} accounts={accounts} loading={loadingAccounts} value={selectedAccount} onValueChange={setAccount} />
                </Field>
            )}

            {allowRecurring && !isEdit && (
                <label className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
                    <span className="flex items-start gap-3">
                        <Repeat className="mt-0.5 size-4 text-primary" />
                        <span>
                            <span className="block text-sm font-medium">Repetir cada mes</span>
                            <span className="block text-xs text-muted-foreground">
                                Ideal para tu salario: se registrará solo el día {parts?.day ?? 1} de cada mes{parts ? ` desde ${monthLabel(parts)}` : ""}.
                            </span>
                        </span>
                    </span>
                    <Switch checked={recurring} onCheckedChange={setRecurring} label="Repetir cada mes" />
                </label>
            )}

            <FormError message={formError} />

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" loading={submitting} loadingText="Guardando…">
                    {isEdit ? <Save /> : <Plus />}
                    {submitLabel ?? (isEdit ? "Guardar cambios" : "Registrar ingreso")}
                </Button>
            </div>
        </form>
    );
}
