import { createBankAccount, deleteBankAccount, listAllBankAccounts, updateBankAccount } from "@/lib/db/queries/bank_accounts";
import { apiRoute } from "@/lib/http";
import { ownerScope } from "@/lib/parsers";
import { asObject, oneOf, optString, reqBalance, reqId, reqString } from "@/lib/validation";
import { listAccountsWithBalance } from "@/lib/db/queries/accounts";
import type { BankAccountInput } from "@/types";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

function parseAccount(value: unknown): BankAccountInput {
    const account = asObject(value, "la cuenta");
    return {
        bank_name: reqString(account.bank_name, "banco", { max: 80 }),
        account_type: oneOf(account.account_type, [1, 2] as const, "tipo de cuenta"),
        // Solo se conservan los últimos 4 dígitos (opcional); nunca el número completo.
        account_number: optString(account.last4 ?? "", "últimos dígitos", { max: 4 }),
        opening_balance: account.opening_balance === undefined || account.opening_balance === null ? undefined : reqBalance(account.opening_balance, "saldo inicial"),
    };
}

export default apiRoute({
    GET: async (req, _res, user) => {
        if (user.isAdmin && req.query.scope === "all") return { bankAccounts: await listAllBankAccounts() };
        return { bankAccounts: await listAccountsWithBalance(user.id) };
    },
    POST: async (req, _res, user) => {
        const { id } = await createBankAccount(user.id, parseAccount(asObject(req.body).bankAccount));
        return { success: true, id };
    },
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        const id = reqId(body.id);
        await updateBankAccount(id, ownerScope(user), parseAccount(body.bankAccount));
        return { success: true, id };
    },
    DELETE: async (req, _res, user) => {
        const id = reqId(asObject(req.body).id);
        await deleteBankAccount(id, ownerScope(user));
        return { success: true, id };
    },
});
