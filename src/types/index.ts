import type { RelativeMonth, YearMonth } from "@/lib/dates";

export type SessionUser = {
    id: number;
    name: string;
    email: string;
    isAdmin: boolean;
    needsOnboarding: boolean;
    emailVerified: boolean;
};

export type Category = {
    id: number;
    name: string;
    category_type: number;
    description: string | null;
};

export type Income = {
    id: number;
    user_id: number;
    amount: number;
    income_date: string;
    description: string | null;
    recurring_income_id?: number | null;
    bank_account_id?: number | null;
    bank_name?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    user_name?: string;
};

export type IncomeInput = {
    amount: number;
    income_date: string;
    description: string;
    /** undefined = cuenta principal; null = sin cuenta */
    bank_account_id?: number | null;
};

/** Definición de un gasto (plantilla). Los fijos se repiten cada mes. */
export type Expense = {
    id: number;
    user_id: number;
    expense_category_id: number;
    category_name?: string;
    category_type?: number;
    name: string;
    description: string | null;
    expense_date: string;
    amount: number;
    frequency_months?: number;
    installments?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    deleted_at?: string | null;
    user_name?: string;
};

export type ExpenseInput = {
    expense_category_id: number;
    name: string;
    description: string;
    expense_date: string;
    amount: number;
    /** Solo gastos fijos: cada cuántos meses se cobra (1 = mensual). */
    frequency_months?: number;
    /** Solo gastos fijos: número total de cuotas (null = indefinido). */
    installments?: number | null;
};

export type ExpenseKind = "fixed" | "variable";

/** Gasto registrado en un mes concreto (instancia que se paga). */
export type PeriodExpense = {
    id: number;
    period_id: number;
    month_id: number;
    year: number;
    month: number;
    month_name: string;
    expense_id: number;
    name: string;
    description: string | null;
    category_id: number;
    category_name: string;
    category_type: number;
    expense_date: string;
    amount: number;
    state_id: number;
    state: string;
    frequency_months?: number;
    installments_total?: number | null;
    installment_number?: number | null;
    paid_account_id?: number | null;
    paid_account_name?: string | null;
};

export type PeriodExpensePatch = {
    amount?: number;
    expense_date?: string;
    expense_state_id?: number;
    name?: string;
    description?: string;
    expense_category_id?: number;
    /** Cuenta desde la que se pagó (undefined = principal; null = ninguna). */
    bank_account_id?: number | null;
};

export type ProjectedExpense = {
    expense_id: number;
    name: string;
    category_name: string;
    category_type: number;
    amount: number;
    expense_date: string;
    installment_number?: number | null;
    installments_total?: number | null;
};

export type Period = {
    id: number;
    name: string;
    description: string | null;
    period_type: number;
    year: number | null;
    month: number | null;
    week: number | null;
    day: number | null;
    parent_id: number | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type BankAccount = {
    id: number;
    user_id: number;
    account_number: string;
    account_type: number;
    bank_name: string;
    account_balance: number;
    balance?: number;
    created_at?: string | null;
    updated_at?: string | null;
    user_name?: string;
};

export type BankAccountInput = {
    bank_name: string;
    account_type: number;
    account_number?: string;
    /** Saldo con el que empieza a controlarse la cuenta. */
    opening_balance?: number;
};

export type PeriodRef = YearMonth & { id: number | null; label: string };

export type CreatedPeriodExpense = {
    id: number;
    period: YearMonth & { id: number; label: string };
    relative: RelativeMonth;
    budgetAlert?: BudgetAlert | null;
};

export type DashboardTotals = {
    income: number;
    projectedIncome: number;
    savings: number;
    expenses: number;
    paid: number;
    pending: number;
    overdue: number;
    upcoming: number;
    projected: number;
    balance: number;
};

export type DashboardData = {
    period: PeriodRef;
    today: string;
    relative: RelativeMonth;
    expenses: PeriodExpense[];
    overdue: PeriodExpense[];
    upcoming: PeriodExpense[];
    projected: ProjectedExpense[];
    incomes: Income[];
    projectedIncomes: ProjectedIncome[];
    budgets: BudgetStatus[];
    accounts: BankAccount[];
    goals: SavingsGoal[];
    totals: DashboardTotals;
};

export type AdminUser = {
    id: number;
    name: string;
    email: string;
    sw_admin: number;
    created_at: string | null;
    onboarding_completed_at: string | null;
};

export type ProjectedIncome = { recurring_income_id: number; description: string; amount: number; income_date: string };

export type RecurringIncome = {
    id: number;
    user_id: number;
    description: string;
    amount: number;
    start_date: string;
    bank_account_id: number | null;
    bank_name?: string | null;
};

export type RecurringIncomeInput = { description: string; amount: number; start_date: string; bank_account_id?: number | null };

export type BudgetStatus = {
    category_id: number;
    category_name: string;
    category_type: number;
    budget: number | null;
    spent: number;
};

export type BudgetAlert = { category_name: string; budget: number; spent: number; level: "warning" | "exceeded" };

export type SavingsGoal = {
    id: number;
    name: string;
    target_amount: number;
    target_date: string | null;
    color: string;
    saved: number;
    month_saved: number;
    contributions: number;
    created_at?: string;
};

export type SavingsGoalInput = { name: string; target_amount: number; target_date: string | null; color: string };

export type SavingsContribution = {
    id: number;
    goal_id: number;
    amount: number;
    contribution_date: string;
    note: string | null;
    bank_account_id: number | null;
    bank_name?: string | null;
};

export type AccountTransaction = {
    id: number;
    account_id: number;
    amount: number;
    transaction_date: string;
    description: string | null;
    kind: "income" | "expense" | "saving" | "adjustment" | "transfer";
};

export type ReportMonth = YearMonth & {
    label: string;
    income: number;
    expenses: number;
    paid: number;
    savings: number;
    balance: number;
};

export type ReportCategory = { category_name: string; category_type: number; total: number; current: number; previous: number };

export type ReportData = {
    months: ReportMonth[];
    categories: ReportCategory[];
    current: ReportMonth;
    previous: ReportMonth;
    averages: { income: number; expenses: number; savings: number };
};

export type AppNotification = {
    id: string;
    kind: "overdue" | "due" | "budget" | "verify" | "goal";
    severity: "danger" | "warning" | "info" | "success";
    title: string;
    detail: string;
    href: string;
};

export type Profile = {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    notify_email: boolean;
    reminder_days: number;
    two_factor_enabled: boolean;
    two_factor_pending: boolean;
    recovery_codes_left: number;
    created_at: string | null;
};
