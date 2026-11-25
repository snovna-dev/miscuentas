import { listBankAccountsByUser } from "@/lib/db/queries/bank_accounts";
import { listFixedExpensesByUser } from "@/lib/db/queries/expenses";
import { listIncomesByUser } from "@/lib/db/queries/incomes";
import { completeOnboarding } from "@/lib/db/queries/users";
import { apiRoute } from "@/lib/http";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default apiRoute({
    /** Estado del onboarding para poder retomarlo donde quedó. */
    GET: async (_req, _res, user) => {
        const [incomes, bankAccounts, expenses] = await Promise.all([
            listIncomesByUser(user.id),
            listBankAccountsByUser(user.id),
            listFixedExpensesByUser(user.id),
        ]);
        return { onboarding: { incomes, bankAccounts, expenses } };
    },
    /** Marca el onboarding como completado para el usuario de la sesión (no el del cuerpo). */
    POST: async (_req, _res, user) => {
        await completeOnboarding(user.id);
        return { success: true, redirectTo: "/user/dashboard" };
    },
});
