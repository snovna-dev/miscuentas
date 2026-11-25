import { Landmark, Ban } from "lucide-react";
import { SelectField } from "@/components/ui/category-select";
import { formatMoney } from "@/lib/format";
import type { BankAccount } from "@/types";

export const NO_ACCOUNT = "none";

/** Select de cuenta: la primera es la principal; "Sin cuenta" no afecta saldos. */
export function AccountSelect({
    id,
    accounts,
    value,
    onValueChange,
    loading,
}: {
    id?: string;
    accounts: BankAccount[];
    value: string;
    onValueChange: (value: string) => void;
    loading?: boolean;
}) {
    return (
        <SelectField
            id={id}
            loading={loading}
            value={value}
            onValueChange={onValueChange}
            placeholder="Selecciona una cuenta"
            options={[
                ...accounts.map((account, index) => ({
                    value: String(account.id),
                    label: `${account.bank_name}${index === 0 ? " (principal)" : ""}`,
                    description: `Saldo ${formatMoney(account.balance ?? account.account_balance)}`,
                    icon: (
                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Landmark className="size-4" />
                        </span>
                    ),
                })),
                {
                    value: NO_ACCOUNT,
                    label: "Sin cuenta",
                    description: "No mueve el saldo de ninguna cuenta",
                    icon: (
                        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Ban className="size-4" />
                        </span>
                    ),
                },
            ]}
        />
    );
}

/** Convierte el valor del select al formato de la API (null = sin cuenta). */
export function accountValue(value: string): number | null | undefined {
    if (!value) return undefined;
    if (value === NO_ACCOUNT) return null;
    return Number(value);
}
