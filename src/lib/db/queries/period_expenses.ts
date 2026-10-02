import { allAsync, getDb, runAsync } from "../index";

type BdNewPeriodExpenseRow = {
    period_id: number,
    expense_id: number,
    expense_date: string,
    amount: number,
    expense_state_id: number,
}

export type DbUpdatePeriodExpenseRow = {
    period_id?: number,
    expense_id: number,
    expense_date: string,
    amount: number,
    expense_state_id: number,
}

export type BdPeriodExpensesRow = {
    id: number,
    month_id: number,
    month_name: string,
    name: string,
    description: string,
    category_id: number,
    category_name: string,
    category_type: number,
    expense_date: string,
    amount: number,
    state: string,
}

export type BdNewExpenseRow = {
    userId: number,
    category: number,
    name: string,
    description: string,
    date: string,
    amount:number
};

export async function createMasivePeriodExpenses(periodExpenses: BdNewPeriodExpenseRow[]): Promise<{ inserted: number }>  {
    const db = getDb();
    const isNow = () => new Date().toISOString();
    let began = false;

    try {
        await runAsync(db, "BEGIN");
        began = true;

        for (const periodExpense of periodExpenses) {

            await runAsync(
                db,
                `INSERT INTO period_expenses
                (
                    period_id,
                    expense_id,
                    expense_date,
                    amount,
                    expense_state_id,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    periodExpense.period_id,
                    periodExpense.expense_id,
                    periodExpense.expense_date,
                    periodExpense.amount,
                    periodExpense.expense_state_id,
                    isNow()
                ]
            );
        }

        await runAsync(db, "COMMIT");

        return {
            inserted: periodExpenses.length
        };

    }catch (e) {
        if (began) await runAsync(db, "ROLLBACK");
        throw e;
    } finally {
        //db.close();
    }  
}

export async function getPeriodExpensesByUser(id: number, periodId: number): Promise<BdPeriodExpensesRow[]> {
    const db = getDb();
//modificar la columna income_date esta mal nombrada
    try {
        const allExpensesResult = await allAsync<BdPeriodExpensesRow>(
            db,
            `SELECT
                pe.id,
                p.id as month_id,
                p.name as month_name,
                e.name,
                e.description,
                ec.id as category_id,
                ec.name as category_name,
                ec.category_type,
                pe.expense_date,
                pe.amount,
                es.name as state
            FROM period_expenses pe
            INNER JOIN expenses e ON e.id = pe.expense_id
            INNER JOIN periods p ON pe.period_id = p.id
            INNER JOIN expense_states es ON es.id = pe.expense_state_id
            INNER JOIN expense_categories ec ON e.expense_category_id = ec.id
            WHERE e.user_id = ? and pe.period_id= ?`,
            [id, periodId],
        );

        if(!allExpensesResult){
            throw new Error("No hay gastos registrados")
        }

        return allExpensesResult;
    }finally {
        //db.close();
    }   
}

export async function getPeriodExpensesNoPayed(id: number, periodId: number): Promise<BdPeriodExpensesRow[]> {
    const db = getDb();

    try {
        const allExpensesResult = await allAsync<BdPeriodExpensesRow>(
            db,
            `SELECT
                pe.id,
                p.id as month_id,
                p.name as month_name,
                e.name,
                e.description,
                ec.id as category_id,
                ec.name as category_name,
                ec.category_type,
                pe.expense_date,
                pe.amount,
                es.name as state
            FROM period_expenses pe
            INNER JOIN expenses e ON e.id = pe.expense_id
            INNER JOIN periods p ON pe.period_id = p.id
            INNER JOIN expense_states es ON es.id = pe.expense_state_id
            INNER JOIN expense_categories ec ON e.expense_category_id = ec.id
            WHERE e.user_id = ? and pe.period_id != ? and pe.expense_state_id != 2`,
            [id, periodId],
        );

        if(!allExpensesResult){
            throw new Error("No hay gastos registrados")
        }

        return allExpensesResult;
    }finally {
        //db.close();
    }   
}

export async function updatePeriodExpense(id: number, data: DbUpdatePeriodExpenseRow) {
    const db = getDb();
    const isNow = () => new Date().toISOString();
    let began = false;

    try {
        await runAsync(db, "BEGIN");
        began = true;

        const updateResult = await runAsync(
            db,
        `UPDATE period_expenses 
        SET period_id = ?,
            expense_date = ?,
            amount = ?,
            expense_state_id = ?,
            updated_at = ?
        WHERE id = ?`,
            [data.period_id, data.expense_date, data.amount, data.expense_state_id, isNow(), id],
        );
        await runAsync(db, "COMMIT");

        if(updateResult.changes === 0){
            throw new Error("No se encontró el gasto a actualizar");
        }
        return {id};
    }catch (e) {
        if (began) await runAsync(db, "ROLLBACK");
        throw e;
    } finally {
        //db.close();
    }  
}

export async function createPeriodExpenseVariable(id: number, newExpense: BdNewExpenseRow, idPeriod: number, expense_state_id: number): Promise<{ id: number }> {
    const db = getDb();
    const isNow = () => new Date().toISOString();
    let began = false;

    try {
        await runAsync(db, "BEGIN");
        began = true;

        const expense = await runAsync(
            db,
            `INSERT INTO expenses (user_id, expense_category_id, name, description, expense_date, amount, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, newExpense.category, newExpense.name, newExpense.description, newExpense.date, newExpense.amount, isNow(), isNow()],
        );

        const periodExpense = await runAsync(
            db,
            `INSERT INTO period_expenses
            (
                period_id,
                expense_id,
                expense_date,
                amount,
                expense_state_id,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                idPeriod,
                expense.lastID,
                newExpense.date,
                newExpense.amount,
                expense_state_id,
                isNow()
            ]
        );

        await runAsync(db, "COMMIT");

        return {id: periodExpense.lastID};
    }catch (e) {
        if (began) await runAsync(db, "ROLLBACK");
        throw e;
    } finally {
        //db.close();
    }  
}

export async function deletePeriodExpense(id: number): Promise<{ id: number }> {
    const db = getDb();
    let began = false;

    try {
        await runAsync(db, "BEGIN");
        began = true;

        const deleteResult = await runAsync(
            db,
            `DELETE FROM period_expenses WHERE id = ?`,
            [id],
        );
        await runAsync(db, "COMMIT");
        
        if(deleteResult.changes === 0){
            throw new Error("No se encontró el gasto a eliminar");
        }
        return {id};
    }catch (e) {
        if (began) await runAsync(db, "ROLLBACK");
        throw e;
    } finally {
        //db.close();
    }  
}