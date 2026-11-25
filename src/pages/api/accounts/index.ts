import { createMovement, deleteMovement, listAccountsWithBalance, listTransactions, updateOpeningBalance } from "@/lib/db/queries/accounts";
import { apiRoute } from "@/lib/http";
import { asObject, optId, optString, reqBalance, reqDate, reqId, reqSignedAmount } from "@/lib/validation";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default apiRoute({
    /** Cuentas con saldo; con ?accountId= devuelve los movimientos de esa cuenta. */
    GET: async (req, _res, user) => {
        if (req.query.accountId) return { transactions: await listTransactions(user.id, reqId(req.query.accountId, "cuenta")) };
        return { accounts: await listAccountsWithBalance(user.id) };
    },
    /** Ajuste manual o transferencia entre cuentas propias. */
    POST: async (req, _res, user) => {
        const body = asObject(req.body);
        await createMovement(user.id, {
            accountId: reqId(body.accountId, "cuenta"),
            toAccountId: optId(body.toAccountId, "cuenta destino"),
            amount: reqSignedAmount(body.amount),
            date: reqDate(body.date, "fecha").iso,
            description: optString(body.description, "descripción", { max: 255 }),
        });
        return { success: true };
    },
    /** Cambia el saldo inicial de la cuenta. */
    PUT: async (req, _res, user) => {
        const body = asObject(req.body);
        await updateOpeningBalance(user.id, reqId(body.id), reqBalance(body.opening_balance, "saldo inicial"));
        return { success: true };
    },
    DELETE: async (req, _res, user) => {
        await deleteMovement(user.id, reqId(asObject(req.body).transactionId, "movimiento"));
        return { success: true };
    },
});
