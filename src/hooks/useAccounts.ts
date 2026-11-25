import * as React from "react";
import { api } from "@/lib/client/api";
import type { BankAccount } from "@/types";

/** Cuentas del usuario con su saldo (para selects y tarjetas). */
export function useAccounts() {
    const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
    const [loading, setLoading] = React.useState(true);

    const reload = React.useCallback(async () => {
        try {
            const data = await api<{ accounts: BankAccount[] }>("/api/accounts");
            setAccounts(data.accounts);
        } catch {
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        reload();
    }, [reload]);

    return { accounts, loading, reload };
}
