import * as React from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { CategorySelect, SelectField } from "@/components/ui/category-select";
import { Switch } from "@/components/ui/switch";
import { PeriodHint } from "@/components/finance/PeriodHint";
import { useCategories } from "@/hooks/useCategories";
import { monthLabel, parseISODate } from "@/lib/dates";
import { FREQUENCIES, frequencyShort, lastInstallmentMonth } from "@/lib/schedule";
import { formatMoney } from "@/lib/format";
import { useToday } from "@/contexts/TodayContext";
import { errorMessage } from "@/lib/client/api";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import type { ExpenseInput, ExpenseKind } from "@/types";

type ExpenseFormProps = {
    kind: ExpenseKind;
    initial?: Partial<ExpenseInput> | null;
    onSubmit: (values: ExpenseInput) => Promise<void>;
    onCancel?: () => void;
    submitLabel?: string;
    compact?: boolean;
    idPrefix?: string;
};

type Errors = Partial<Record<keyof ExpenseInput, string>>;

function emptyValues(today: string, initial?: Partial<ExpenseInput> | null) {
    return {
        expense_category_id: initial?.expense_category_id ? String(initial.expense_category_id) : "",
        name: initial?.name ?? "",
        description: initial?.description ?? "",
        expense_date: initial?.expense_date?.slice(0, 10) || today,
        amount: initial?.amount ?? null,
        frequency_months: String(initial?.frequency_months ?? 1),
        installments: initial?.installments ? String(initial.installments) : "",
        hasInstallments: Boolean(initial?.installments),
    } as {
        expense_category_id: string;
        name: string;
        description: string;
        expense_date: string;
        amount: number | null;
        frequency_months: string;
        installments: string;
        hasInstallments: boolean;
    };
}

/**
 * Formulario único para gastos fijos y variables.
 * La fecha define el mes donde se registra: una fecha superior a hoy queda en el mes de esa fecha.
 */
export function ExpenseForm({ kind, initial, onSubmit, onCancel, submitLabel, compact = false, idPrefix = kind }: ExpenseFormProps) {
    const categoryType = kind === "fixed" ? ExpenseCategoryType.FIXED : ExpenseCategoryType.VARIABLE;
    const { categories, loading: loadingCategories } = useCategories(categoryType);
    const today = useToday();
    const [values, setValues] = React.useState(() => emptyValues(today, initial));
    const [errors, setErrors] = React.useState<Errors>({});
    const [formError, setFormError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const nameRef = React.useRef<HTMLInputElement>(null);
    const isEdit = Boolean(initial);

    const id = (field: string) => `${idPrefix}-${field}`;

    function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
        setValues((current) => ({ ...current, [key]: value }));
        if (errors[key as keyof Errors]) setErrors((current) => ({ ...current, [key]: undefined }));
    }

    function validate(): Errors {
        const next: Errors = {};
        if (!values.expense_category_id) next.expense_category_id = "Elige una categoría.";
        if (values.name.trim().length < 2) next.name = "Escribe un nombre de al menos 2 caracteres.";
        if (!values.amount || values.amount <= 0) next.amount = "El valor debe ser mayor a cero.";
        if (!parseISODate(values.expense_date)) next.expense_date = "Elige una fecha válida.";
        if (kind === "fixed" && values.hasInstallments) {
            const n = Number(values.installments);
            if (!Number.isInteger(n) || n < 1 || n > 600) next.installments = "Indica un número de cuotas entre 1 y 600.";
        }
        return next;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitting(true);
        try {
            await onSubmit({
                expense_category_id: Number(values.expense_category_id),
                name: values.name.trim(),
                description: values.description.trim(),
                expense_date: values.expense_date,
                amount: values.amount!,
                ...(kind === "fixed"
                    ? {
                          frequency_months: Number(values.frequency_months),
                          installments: values.hasInstallments ? Number(values.installments) : null,
                      }
                    : {}),
            });
            if (!isEdit) {
                // Conserva categoría y fecha para registrar varios gastos seguidos más rápido.
                setValues((current) => ({ ...current, name: "", description: "", amount: null }));
                nameRef.current?.focus();
            }
        } catch (error) {
            setFormError(errorMessage(error, "No fue posible guardar el gasto."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="Categoría" htmlFor={id("category")} required error={errors.expense_category_id}>
                <CategorySelect
                    id={id("category")}
                    categories={categories}
                    loading={loadingCategories}
                    value={values.expense_category_id}
                    onValueChange={(value) => update("expense_category_id", value)}
                    invalid={Boolean(errors.expense_category_id)}
                />
            </Field>

            <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
                <Field label="Nombre" htmlFor={id("name")} required error={errors.name}>
                    <Input
                        ref={nameRef}
                        id={id("name")}
                        value={values.name}
                        maxLength={120}
                        placeholder={kind === "fixed" ? "Ej: Arriendo apartamento" : "Ej: Almuerzo con amigos"}
                        onChange={(event) => update("name", event.target.value)}
                        aria-invalid={Boolean(errors.name) || undefined}
                    />
                </Field>

                <Field label="Valor" htmlFor={id("amount")} required error={errors.amount}>
                    <MoneyInput
                        id={id("amount")}
                        value={values.amount}
                        placeholder="0"
                        onValueChange={(value) => update("amount", value)}
                        aria-invalid={Boolean(errors.amount) || undefined}
                    />
                </Field>
            </div>

            <Field
                label={kind === "fixed" ? "Fecha de pago" : "Fecha del gasto"}
                htmlFor={id("date")}
                required
                error={errors.expense_date}
            >
                <Input
                    id={id("date")}
                    type="date"
                    value={values.expense_date}
                    min="2000-01-01"
                    max="2100-12-31"
                    onChange={(event) => update("expense_date", event.target.value)}
                    aria-invalid={Boolean(errors.expense_date) || undefined}
                />
            </Field>

            {kind === "fixed" && (
                <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
                    <Field label="¿Cada cuánto se paga?" htmlFor={id("frequency")}>
                        <SelectField
                            id={id("frequency")}
                            value={values.frequency_months}
                            onValueChange={(v) => update("frequency_months", v)}
                            options={FREQUENCIES.map((f) => ({ value: String(f.value), label: f.label, description: f.value === 12 ? "Ej: SOAT, impuesto predial" : f.value === 1 ? "Ej: arriendo, servicios" : undefined }))}
                        />
                    </Field>
                    <label className="flex items-center justify-between gap-4">
                        <span>
                            <span className="block text-sm font-medium">Tiene un número de cuotas</span>
                            <span className="block text-xs text-muted-foreground">Créditos, compras a plazos… dejará de cobrarse al terminar.</span>
                        </span>
                        <Switch checked={values.hasInstallments} onCheckedChange={(v) => update("hasInstallments", v)} label="Tiene número de cuotas" />
                    </label>
                    {values.hasInstallments && (
                        <Field
                            label="Número de cuotas"
                            htmlFor={id("installments")}
                            error={errors.installments}
                            hint={(() => {
                                const n = Number(values.installments);
                                const last = n > 0 ? lastInstallmentMonth({ start: values.expense_date, frequency: Number(values.frequency_months), installments: n }) : null;
                                return last ? `Última cuota en ${monthLabel(last)}${values.amount ? ` · total ${formatMoney(values.amount * n)}` : ""}` : undefined;
                            })()}
                        >
                            <Input
                                id={id("installments")}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={600}
                                value={values.installments}
                                onChange={(e) => update("installments", e.target.value)}
                                placeholder="Ej: 12"
                                className="max-w-32"
                                aria-invalid={Boolean(errors.installments) || undefined}
                            />
                        </Field>
                    )}
                </div>
            )}

            <PeriodHint date={values.expense_date} recurring={kind === "fixed" && !isEdit ? frequencyShort(Number(values.frequency_months)) : false} />

            <Field label="Descripción" htmlFor={id("description")} optional>
                <Input
                    id={id("description")}
                    value={values.description}
                    maxLength={255}
                    placeholder="Detalle o nota para recordar"
                    onChange={(event) => update("description", event.target.value)}
                />
            </Field>

            <FormError message={formError} />

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" loading={submitting} loadingText="Guardando…" block={compact}>
                    {isEdit ? <Save /> : <Plus />}
                    {submitLabel ?? (isEdit ? "Guardar cambios" : kind === "fixed" ? "Agregar gasto fijo" : "Registrar gasto")}
                </Button>
            </div>
        </form>
    );
}
