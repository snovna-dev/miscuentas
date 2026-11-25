import * as React from "react";
import { Landmark, Lock } from "lucide-react";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { BankAccountInput } from "@/types";

const POPULAR_BANKS = ["Bancolombia", "Davivienda", "Banco de Bogotá", "BBVA", "Nequi", "Nu", "Banco Popular", "Scotiabank Colpatria"];

type Props = {
    initial?: Partial<BankAccountInput> | null;
    onSubmit: (values: BankAccountInput & { last4?: string }) => Promise<void>;
    onCancel?: () => void;
    submitLabel?: string;
    /** Pide el saldo actual de la cuenta (saldo inicial). */
    withOpeningBalance?: boolean;
};

export function BankAccountForm({ initial, onSubmit, onCancel, submitLabel, withOpeningBalance = false }: Props) {
    const [bankName, setBankName] = React.useState(initial?.bank_name ?? "");
    const [accountType, setAccountType] = React.useState<number>(initial?.account_type ?? 1);
    const [last4, setLast4] = React.useState("");
    const [opening, setOpening] = React.useState<number | null>(initial?.opening_balance ?? null);
    const [error, setError] = React.useState<string | null>(null);
    const [nameError, setNameError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        if (bankName.trim().length < 2) {
            setNameError("Escribe el nombre de tu banco.");
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({
                bank_name: bankName.trim(),
                account_type: accountType,
                last4: last4 || undefined,
                ...(withOpeningBalance ? { opening_balance: opening ?? 0 } : {}),
            });
        } catch (err) {
            setError(errorMessage(err, "No fue posible guardar la cuenta."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Field label="Banco o billetera" htmlFor="bank-name" required error={nameError}>
                <Input
                    id="bank-name"
                    value={bankName}
                    maxLength={80}
                    placeholder="Ej: Bancolombia"
                    list="bank-suggestions"
                    onChange={(e) => {
                        setBankName(e.target.value);
                        setNameError(null);
                    }}
                    aria-invalid={Boolean(nameError) || undefined}
                />
                <datalist id="bank-suggestions">
                    {POPULAR_BANKS.map((bank) => (
                        <option key={bank} value={bank} />
                    ))}
                </datalist>
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {POPULAR_BANKS.slice(0, 5).map((bank) => (
                        <button
                            key={bank}
                            type="button"
                            onClick={() => {
                                setBankName(bank);
                                setNameError(null);
                            }}
                            className={cn(
                                "rounded-full border px-2.5 py-1 text-xs transition",
                                bankName === bank ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40 hover:text-primary"
                            )}
                        >
                            {bank}
                        </button>
                    ))}
                </div>
            </Field>

            <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium text-foreground/90">Tipo de cuenta</legend>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { value: 1, label: "Ahorros", hint: "La más común" },
                        { value: 2, label: "Corriente", hint: "Con chequera" },
                    ].map((option) => (
                        <label
                            key={option.value}
                            className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                                accountType === option.value ? "border-primary bg-primary/6 ring-2 ring-primary/15" : "hover:border-foreground/25"
                            )}
                        >
                            <input
                                type="radio"
                                name="account_type"
                                value={option.value}
                                checked={accountType === option.value}
                                onChange={() => setAccountType(option.value)}
                                className="sr-only"
                            />
                            <Landmark className={cn("size-5", accountType === option.value ? "text-primary" : "text-muted-foreground")} />
                            <span>
                                <span className="block text-sm font-medium">{option.label}</span>
                                <span className="block text-xs text-muted-foreground">{option.hint}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <Field
                label="Últimos 4 dígitos"
                htmlFor="bank-last4"
                optional
                hint={
                    <span className="flex items-center gap-1">
                        <Lock className="size-3" /> Nunca te pediremos el número completo ni claves.
                    </span>
                }
            >
                <Input
                    id="bank-last4"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={last4}
                    placeholder="1234"
                    className="max-w-32 tabular tracking-[0.3em]"
                    onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
            </Field>

            {withOpeningBalance && (
                <Field label="Saldo actual" htmlFor="bank-opening" optional hint="Lo que tienes hoy en la cuenta. Desde aquí se sumarán tus ingresos y se restarán tus pagos.">
                    <MoneyInput id="bank-opening" value={opening} onValueChange={setOpening} placeholder="0" />
                </Field>
            )}

            <FormError message={error} />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" loading={submitting} loadingText="Guardando…">
                    {submitLabel ?? "Guardar cuenta"}
                </Button>
            </div>
        </form>
    );
}
