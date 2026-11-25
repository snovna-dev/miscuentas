import { compareYM, monthLabel, relativeMonth, type YearMonth } from "@/lib/dates";
import { serverCurrentMonth, serverToday } from "@/lib/serverTime";
import { ExpenseState } from "@/emuns/ExpenseState";
import { findMonthPeriod } from "./periods";
import { getDb } from "../index";
import { listIncomesByUser, listProjectedIncomes } from "./incomes";
import { listBudgetStatus } from "./budgets";
import { listAccountsWithBalance } from "./accounts";
import { listGoals, monthSavings } from "./savings";
import {
    ensureMonthGenerated,
    listOverdueExpenses,
    listPeriodExpensesByMonth,
    listProjectedFixedExpenses,
    listUpcomingExpenses,
} from "./period_expenses";
import type { DashboardData } from "@/types";

const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + Number(item.amount), 0);

/**
 * Todo el tablero en UNA petición: gastos, ingresos (reales y proyectados),
 * presupuestos, cuentas, metas de ahorro y totales.
 */
export async function getDashboard(userId: number, ym: YearMonth): Promise<DashboardData> {
    const relative = relativeMonth(ym, serverCurrentMonth());

    // Gastos fijos e ingresos recurrentes se registran automáticamente al llegar al mes en curso.
    if (relative === "current") await ensureMonthGenerated(userId, ym);

    const [period, expenses, overdue, upcoming, projected, incomes, projectedIncomes, budgets, accounts, goals, savings] = await Promise.all([
        findMonthPeriod(getDb(), ym.year, ym.month),
        listPeriodExpensesByMonth(userId, ym),
        relative === "current" ? listOverdueExpenses(userId, ym) : Promise.resolve([]),
        relative === "current" ? listUpcomingExpenses(userId, ym) : Promise.resolve([]),
        relative === "future" ? listProjectedFixedExpenses(userId, ym) : Promise.resolve([]),
        listIncomesByUser(userId, ym),
        relative === "future" ? listProjectedIncomes(userId, ym) : Promise.resolve([]),
        listBudgetStatus(userId, ym, true),
        listAccountsWithBalance(userId),
        listGoals(userId, ym),
        monthSavings(userId, ym),
    ]);

    const paid = sum(expenses.filter((e) => Number(e.state_id) === ExpenseState.PAID));
    const pending = sum(expenses.filter((e) => Number(e.state_id) === ExpenseState.PENDING));
    const totalExpenses = paid + pending;
    const income = sum(incomes);
    const projectedIncome = sum(projectedIncomes);
    const projectedTotal = sum(projected);

    return {
        period: { id: period?.id ?? null, ...ym, label: monthLabel(ym) },
        today: serverToday(),
        relative,
        expenses,
        overdue,
        upcoming: upcoming.filter((e) => compareYM(e, ym) > 0),
        projected,
        incomes,
        projectedIncomes,
        budgets,
        accounts,
        goals,
        totals: {
            income,
            projectedIncome,
            savings,
            expenses: totalExpenses,
            paid,
            pending,
            overdue: sum(overdue),
            upcoming: sum(upcoming),
            projected: projectedTotal,
            balance: income + projectedIncome - totalExpenses - projectedTotal - savings,
        },
    };
}
