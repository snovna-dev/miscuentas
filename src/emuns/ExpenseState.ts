/** IDs fijos de la tabla expense_states (el seed los garantiza). */
export enum ExpenseState {
    PENDING = 1,
    PAID = 2,
}

export const EXPENSE_STATE_LABEL: Record<ExpenseState, string> = {
    [ExpenseState.PENDING]: "Pendiente",
    [ExpenseState.PAID]: "Pagado",
};
