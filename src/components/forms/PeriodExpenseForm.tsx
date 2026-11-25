import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { CategorySelect } from "@/components/ui/category-select";
import { PeriodHint } from "@/components/finance/PeriodHint";
import { AccountSelect, accountValue, NO_ACCOUNT } from "@/components/finance/AccountSelect";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { errorMessage } from "@/lib/client/api";
import { parseISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import { ExpenseState } from "@/emuns/ExpenseState";
import type { PeriodExpense, PeriodExpensePatch } from "@/types";

type Props = {
    expense: PeriodExpense;
    onSubmit: (patch: PeriodExpensePatch) => Promise<void>;
    onCancel?: () => void;
    /** Oculta "Pagado desde" (el admin no conoce las cuentas del usuario). */
    showAccount?: boolean;
};

/** Edición de un gasto ya registrado en un mes. Si cambias la fecha a otro mes, el gasto se mueve. */
export function PeriodExpenseForm({ expense, onSubmit, onCancel, showAccount = true }: Props) {
    const isFixed = Number(expense.category_type) === ExpenseCategoryType.FIXED;
    const { categories, loading } = useCategories(isFixed ? ExpenseCategoryType.FIXED : ExpenseCategoryType.VARIABLE);

    const [name, setName] = React.useState(expense.name);
    const [description, setDescription] = React.useState(expense.description ?? "");
    const [categoryId, setCategoryId] = React.useState(String(expense.category_id));
    const [amount, setAmount] = React.useState<number | null>(Number(expense.amount));
    const [date, setDate] = React.useState(expense.expense_date.slice(0, 10));
    const [state, setState] = React.useState<number>(Number(expense.state_id));
    const { accounts, loading: loadingAccounts } = useAccounts();
    const [account, setAccount] = React.useState(expense.paid_account_id ? String(expense.paid_account_id) : "");
    const selectedAccount = account || (accounts[0] ? String(accounts[0].id) : NO_ACCOUNT);
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        if (!amount || amount <= 0) return setError("El valor debe ser mayor a cero.");
        if (!parseISODate(date)) return setError("Elige una fecha válida.");
        if (!isFixed && name.trim().length < 2) return setError("Escribe un nombre válido.");

        const patch: PeriodExpensePatch = { amount, expense_date: date, expense_state_id: state };
        if (showAccount && state === ExpenseState.PAID && !loadingAccounts) patch.bank_account_id = accountValue(selectedAccount);
        if (!isFixed) {
            patch.name = name.trim();
            patch.description = description.trim();
            patch.expense_category_id = Number(categoryId);
        }

        setSubmitting(true);
        try {
            await onSubmit(patch);
        } catch (err) {
            setError(errorMessage(err, "No fue posible actualizar el gasto."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {isFixed ? (
                <div className="rounded-xl bg-muted/60 px-3.5 py-3 text-sm">
                    <p className="font-medium">{expense.name}</p>
                    <p className="text-xs text-muted-foreground">
                        Gasto fijo · {expense.category_name}. El nombre se edita desde <strong>Gastos fijos</strong>.
                    </p>
                </div>
            ) : (
                <>
                    <Field label="Categoría" htmlFor="pe-category">
                        <CategorySelect id="pe-category" categories={categories} loading={loading} value={categoryId} onValueChange={setCategoryId} />
                    </Field>
                    <Field label="Nombre" htmlFor="pe-name" required>
                        <Input id="pe-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
                    </Field>
                </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor" htmlFor="pe-amount" required>
                    <MoneyInput id="pe-amount" value={amount} onValueChange={setAmount} />
                </Field>
                <Field label="Fecha" htmlFor="pe-date" required>
                    <Input id="pe-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
            </div>

            {date.slice(0, 7) !== expense.expense_date.slice(0, 7) && <PeriodHint date={date} />}

            {!isFixed && (
                <Field label="Descripción" htmlFor="pe-description" optional>
                    <Input id="pe-description" value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} />
                </Field>
            )}

            <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Estado</legend>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { value: ExpenseState.PENDING, label: "Pendiente", tone: "border-warning bg-warning/12 ring-warning/25" },
                        { value: ExpenseState.PAID, label: "Pagado", tone: "border-success bg-success/10 ring-success/20" },
                    ].map((option) => (
                        <label
                            key={option.value}
                            className={cn(
                                "flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                                state === option.value ? cn("ring-2", option.tone) : "text-muted-foreground hover:border-foreground/25"
                            )}
                        >
                            <input
                                type="radio"
                                name="pe-state"
                                className="sr-only"
                                checked={state === option.value}
                                onChange={() => setState(option.value)}
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            </fieldset>

            {showAccount && state === ExpenseState.PAID && accounts.length > 0 && (
                <Field label="Pagado desde" htmlFor="pe-account" hint="Se descuenta del saldo de esa cuenta.">
                    <AccountSelect id="pe-account" accounts={accounts} loading={loadingAccounts} value={selectedAccount} onValueChange={setAccount} />
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
                    <Save /> Guardar cambios
                </Button>
            </div>
        </form>
    );
}
