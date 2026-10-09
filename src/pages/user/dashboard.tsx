import { Button } from "@/components/buttons";
import { FormExpensesVariable } from "@/components/form_expenses";
import { FormPeriodExpense, FormPeriodExpenseVariableByUser } from "@/components/form_periodExpenses";
import { Header } from "@/components/header";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import { Edit, Eye, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatMoneyCol } from "@/lib/formatMoney";
import Loader from "@/components/Loader";

type PeriodRow = {
    id: number,
    name: string,
    description: string,
    period_type: number,
    year: number,
    month: number,
    week: number,
    day: number,
    parent_id: number,
    created_at: string,
    updated_at: string,
}

type ExpenseRow = {
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
};

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

type ExpensesForm = {
    expense_category_id: number;
    name: string;
    description: string;
    expense_date: string;
    amount: number;
};

type ExpensePeriodRow = {
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
};

export default function Dasboard () {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [periodYear, setPeriodYear] = useState<PeriodRow |null>();
    const [periodMonth, setPeriodMonth] = useState<PeriodRow |null>();
    const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRow | null>(null);
    const [reloadTable, setReloadTable] = useState(false);
    const [periodExpenses, setPeriodExpenses] = useState<BdPeriodExpensesRow[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [periodExpensesNoPayed, setPeriodExpensesNoPayed] = useState<BdPeriodExpensesRow[]>([]);
    const [expensePeriodToEdit, setExpensePeriodToEdit] = useState<ExpensePeriodRow | null>(null);

    //Funcion para calcular el total a pagar de los gastos del mes y los gastos pendientes teniendo el cuenta el estado del gasto
    function getTotalPeriodExpenses(
        periodExpenses: BdPeriodExpensesRow[],
        periodExpensesNoPayed: BdPeriodExpensesRow[]
    ): number {
        const totaolPeriodExpenses = periodExpenses
            .filter((expense) => expense.state === "Pendiente")
            .reduce((total, expense) => {
                return total + Number(expense.amount);
            }, 0);

        const totaolPeriodExpensesNoPayed = periodExpensesNoPayed
            .filter((expenseNoPayed) => expenseNoPayed.state === "Pendiente")
            .reduce((total, expenseNoPayed) => {
                return total + Number(expenseNoPayed.amount);
            }, 0);

        return totaolPeriodExpenses + totaolPeriodExpensesNoPayed;
    }

    function getCategoryTypeLabel(type: ExpenseCategoryType): string {
        switch (type) {
            case ExpenseCategoryType.FIXED:
                return "Fijo";

            case ExpenseCategoryType.VARIABLE:
                return "Variable";

            case ExpenseCategoryType.SAVINGS:
                return "Ahorro";

            default:
                return "Desconocido";
        }
    }

    //Funcion para hacer el cambio de estado del gasto del periodo
    async function handleCheckpay(expense: BdPeriodExpensesRow){
        try {

            const expenseToPay = {
                expense_date: expense.expense_date,
                amount: expense.amount,
                expense_state_id: 2,
                period_id: expense.month_id,
            }

            const body = {
                id: expense.id,
                periodExpense: expenseToPay
            }

            const res = await fetch("/api/periodExpenses", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                throw new Error();
            }

            await handleLoadPeriodExpenses();
            await handleLoadPeriodExpensesNoPayed();
        } catch (err) {
            setError("!Error al pagar gasto¡");
            console.log(err);
        } finally {
            setTimeout(() => setError(null), 5000);
            setLoading(false);
        }
    }

    async function handleLoadPeriodExpenses(){
        setError(null);
        setLoading(true);
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;

        try {
            //consulta y valida si hay un periodo del mes actual, arreglar para que valide con el mes actual
            const res = await fetch(`/api/periods?month=${month}&year=${year}`, {
                method: "GET",
            });
            const dataPeriodsMonth = await res.json();

            if (!res.ok) {
                setError(dataPeriodsMonth.error);
                return;
            }
            setPeriodMonth(dataPeriodsMonth.periodBymonth);
            if(Object.keys(dataPeriodsMonth).length != 0){

                const res = await fetch(`/api/periodExpenses?periodId=${dataPeriodsMonth.periodBymonth.id}`, {
                    method: "GET",
                });
                const dataPeriodExpenses = await res.json();
    
                if (!res.ok) {
                    setError(dataPeriodExpenses.error);
                    return;
                }
    
                setPeriodExpenses(dataPeriodExpenses.periodExpenses ?? []);
            }
        } catch (err) {
            setError("!Informacion de ingresos vacia¡");
            console.log(err);
        }finally {
            setTimeout(() => setError(null), 5000);
            setLoading(false);
        }
    }

    async function handleLoadPeriodExpensesNoPayed(){
        setError(null);
        setLoading(true);
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;

        try {
            //consulta y valida si hay un periodo del mes actual, arreglar para que valide con el mes actual
            const res = await fetch(`/api/periods?month=${month}&year=${year}`, {
                method: "GET",
            });
            const dataPeriodsMonth = await res.json();

            if (!res.ok) {
                setError(dataPeriodsMonth.error);
                return;
            }
            setPeriodMonth(dataPeriodsMonth.periodBymonth);
            if(Object.keys(dataPeriodsMonth).length != 0){

                const res = await fetch(`/api/periodExpenses?periodId=${dataPeriodsMonth.periodBymonth.id}&noPayed=true`, {
                    method: "GET",
                });
                const dataPeriodExpenses = await res.json();
    
                if (!res.ok) {
                    setError(dataPeriodExpenses.error);
                    return;
                }
    
                setPeriodExpensesNoPayed(dataPeriodExpenses.periodExpenses ?? []);
            }
        } catch (err) {
            setError("!Informacion de ingresos vacia¡");
            console.log(err);
        }finally {
            setTimeout(() => setError(null), 5000);
            setLoading(false);
        }
    }

    async function handleSearchPeriod () {
        setError(null);
        setLoading(true);
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;

        try { 
            //realiza consulta y valida si hay un periodo del año actual, creado
            const res = await fetch(`/api/periods?year=${year}`, {
                method: "GET",
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                return;
            }
            setPeriodYear(data.periodsByYear);
            if(Object.keys(data).length != 0){

                //consulta y valida si hay un periodo del mes actual, arreglar para que valide con el mes actual
                const res = await fetch(`/api/periods?month=${month}&year=${year}`, {
                    method: "GET",
                });
                const dataPeriodsMonth = await res.json();

                if (!res.ok) {
                    setError(dataPeriodsMonth.error);
                    return;
                }
                setPeriodMonth(dataPeriodsMonth.periodBymonth);
                if(Object.keys(dataPeriodsMonth).length != 0){

                    //consulta y valida si tiene gastos del periodo actual creados
                    const res = await fetch(`/api/periodExpenses?periodId=${dataPeriodsMonth.periodBymonth.id}`, {
                        method: "GET",
                    });
                    const dataPeriodExpenses = await res.json();

                    //si no tiene gastos del periodos creados consulta los gastos configurados por el usuario y los crea en los gastos del periodo actual
                    if(dataPeriodExpenses.periodExpenses.length == 0){
                        const res = await fetch(`/api/expenses?type=dashboard`, {
                            method: "GET",
                        });
                        const dataExpenses = await res.json();

                        if(dataExpenses.expenses.length > 0){
                            //recopila la data para realizar la creacion de los gastos del periodo actual
                            const dataToSend = {
                                periodId: dataPeriodsMonth.periodBymonth.id,
                                expenses: dataExpenses.expenses,
                            }

                            //crea los gastos del periodo con los gastos consultados
                            const res = await fetch(`/api/periodExpenses`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(dataToSend),
                            });
                            const data = await res.json();

                            if(data){
                                handleLoadPeriodExpenses();
                            }
                        }
                    }else{
                        setPeriodExpenses(dataPeriodExpenses.periodExpenses ?? []);
                        handleLoadPeriodExpensesNoPayed();
                    }
                }
            }
        } catch (err) {
            setError("!Informacion de gastos vacia¡");
            console.log(err);
        }finally {
            setTimeout(() => setError(null), 5000);
            setLoading(false);
        }

    }

    //Funcion para crear un gasto variable
    async function handleCreatePeriodExpenseVariable(expense: ExpensesForm) {
        const res = await fetch("/api/me");
        const dataUser = await res.json();        
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;

        try {
            //consulta y valida si hay un periodo del mes actual, arreglar para que valide con el mes actual
            let res = await fetch(`/api/periods?month=${month}&year=${year}`, {
                method: "GET",
            });
            const dataPeriodsMonth = await res.json();

            if (!res.ok) {
                setError(dataPeriodsMonth.error);
                return;
            }

            const dataToSend = {
                id: dataUser.user.id,
                expense: expense,
                periodId: dataPeriodsMonth.periodBymonth.id,
            }
    
            res = await fetch("/api/periodExpenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSend),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                return;
            }

            handleLoadPeriodExpenses();
            setSuccess(data.id);
            setTimeout(() => setSuccess(null), 5000);

        } catch (err) {
            setError("Error al crear el gasto variable. Por favor, inténtalo de nuevo.");
            setTimeout(() => setError(null), 5000);
        }
    }

    async function handleUpdateExpense(){

    }

    //Controlador para eliminar un gasto del periodo
    async function handleDeletePeriodExpense(id: number){
        setError(null);
        setLoading(true);
        try {
            const res = await fetch("/api/periodExpenses", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) {
                throw new Error();
            }

            await handleLoadPeriodExpenses();
        } catch (err) {
            setError("!Error al eliminar ingreso¡");
            console.log(err);
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    }

    //Funcion para actualizar un gasto del periodo
    async function handleUpdatePeriodExpense(periodExpense: ExpensesForm){
        const body = {
            id: expensePeriodToEdit?.id,
            periodExpense: periodExpense,
        };

        try {
            const res = await fetch("/api/periodExpenses", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            handleLoadPeriodExpenses();

            if (!res.ok) {
                setError(data.error);
                return;
            }

            setSuccess(data.id);
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            setError("Error al actualizar el gasto. Por favor, inténtalo de nuevo.");
            setTimeout(() => setError(null), 5000);
        }
    }

    async function handleCreatePeriodExpense(expense: ExpensesForm) {

    }

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            
            try {
                await Promise.all([
                    handleSearchPeriod(),
                ]);
                
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

return (
    <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto space-y-8 px-4 py-8">
            
            {/* Encabezado */}
            <section className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                    Administración de gastos
                </h1>

                <p className="text-muted-foreground">
                    Registra, administra y consulta tus gastos del período actual.
                </p>
            </section>

            {/* Acciones principales */}
            <section className="flex">
                <Button href="/user/incomes">
                    Registrar ingreso
                </Button>

                <Button href="/user/expenses">
                    Registrar gasto fijo
                </Button>

                {/* <Button
                    variant="color"
                    onClick={handleSearchPeriod}
                >
                    <Eye/>  
                    gastos del mes
                </Button> */}
            </section>

            {/* Resumen */}
            <section className="grid gap-4 md:grid-cols-2">
                {/* Información del período */}
                <div className="space-y-4">
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Mes actual
                        </h2>

                        {periodYear && periodMonth ? (
                            <div className="mt-2">
                                <p className="text-muted-foreground">
                                    Datos del período:
                                </p>

                                <p className="text-xl font-medium">
                                    {periodYear.name} {periodMonth.name}
                                </p>
                            </div>
                        ) : (
                            <p className="mt-2 text-muted-foreground">
                                No hay un período creado para la fecha actual.
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground">
                            Cantidad de gastos
                        </p>

                        <p className="mt-1 text-3xl font-bold">
                            {periodExpenses.length}
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground">
                            Total de gastos por pagar
                        </p>

                        <p className="mt-1 text-3xl font-bold">
                            {getTotalPeriodExpenses(periodExpenses, periodExpensesNoPayed).toLocaleString(
                                "es-CO",
                                {
                                    style: "currency",
                                    currency: "COP",
                                    minimumFractionDigits: 0,
                                }
                            )}
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">
                            {expenseToEdit
                                ? "Actualizar gasto"
                                : "Registrar nuevo gasto"}
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Registra tus gastos inesperados.
                        </p>
                    </div>

                    <FormPeriodExpenseVariableByUser
                        createPeriodExpense={handleCreatePeriodExpenseVariable}
                        periodExpenseToEdit={expenseToEdit}
                        UpdatePeriodExpense={handleUpdateExpense}
                    />
                    {/* Mensajes */}
                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-600">
                            Ingreso con ID {success} registrado correctamente.
                        </div>
                    )}
                </div>
            </section>

            {/* Tabla */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold">
                        Gastos del mes
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Consulta y administra los gastos registrados.
                    </p>
                </div>

                {periodExpenses.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                        <p className="text-muted-foreground">
                            No hay gastos registrados para este período.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {periodExpenses.map((inc) => (
                            <div
                                key={inc.id}
                                className="relative rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                            >
                                {/* Botón eliminar */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"default"}
                                            size="icon"
                                            className="absolute right-3 top-3 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            title="Eliminar gasto"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Estas seguro que deseas eliminar el gasto?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción es irreversible. Esto eliminará permanentemente su
                                            cuenta de nuestros servidores.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePeriodExpense(inc.id)}>Continuar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Botón de informacion */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"default"}
                                            size="icon"
                                            className="absolute right-3 top-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            title="Ver información del gasto"
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent className="max-w-lg">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-xl">
                                                Información del gasto
                                            </AlertDialogTitle>

                                            <AlertDialogDescription>
                                                Consulta todos los detalles del gasto seleccionado.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        {/* Información del gasto */}
                                        <div className="space-y-4">
                                            {/* Nombre */}
                                            <div className="rounded-lg border bg-muted/30 p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Gasto
                                                </p>

                                                <p className="mt-1 text-lg font-semibold">
                                                    {inc.name ?? "-"}
                                                </p>
                                            </div>

                                            {/* Información principal */}
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {/* Monto */}
                                                <div className="rounded-lg border p-4">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Monto
                                                    </p>

                                                    <p className="mt-1 text-xl font-bold">
                                                        {Number(inc.amount).toLocaleString(
                                                            "es-CO",
                                                            {
                                                                style: "currency",
                                                                currency: "COP",
                                                                minimumFractionDigits: 0,
                                                            }
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Estado */}
                                                <div className="rounded-lg border p-4">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Estado
                                                    </p>

                                                    <div className="mt-2">
                                                        <span
                                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                                                inc.state === "Pendiente"
                                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                            }`}
                                                        >
                                                            {inc.state}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fecha */}
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Fecha del gasto
                                                </p>

                                                <p className="mt-1 text-sm font-medium">
                                                    {inc.expense_date
                                                        ? new Date(
                                                            inc.expense_date
                                                        ).toLocaleDateString("es-CO", {
                                                            day: "2-digit",
                                                            month: "long",
                                                            year: "numeric",
                                                        })
                                                        : "-"}
                                                </p>
                                            </div>

                                            {/* Categoría */}
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Categoría
                                                </p>

                                                <p className="mt-1 text-sm font-medium">
                                                    {inc.category_name ?? "-"} ({getCategoryTypeLabel(inc.category_type)})
                                                </p>
                                            </div>

                                            {/* Descripción */}
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Descripción
                                                </p>

                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {inc.description || "Sin descripción"}
                                                </p>
                                            </div>
                                        </div>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cerrar
                                            </AlertDialogCancel>

                                            {/* <AlertDialogAction>
                                                Editar
                                            </AlertDialogAction> */}
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Botón editar */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"default"}
                                            size="icon"
                                            className="absolute right-3 top-15 rounded-full text-muted-foreground hover:bg-chart-2/10 hover:text-chart-2"
                                            title="Ver información del gasto"
                                            onClick={() => setExpensePeriodToEdit(inc)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent className="max-w-lg">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-xl">
                                                Información del gasto
                                            </AlertDialogTitle>

                                            <AlertDialogDescription>
                                                Consulta todos los detalles del gasto seleccionado.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        {/* edicion del gasto */}
                                        <FormPeriodExpense createPeriodExpense={handleCreatePeriodExpense} periodExpenseToEdit={expensePeriodToEdit} UpdatePeriodExpense={handleUpdatePeriodExpense}/>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cerrar
                                            </AlertDialogCancel>

                                            {/* <AlertDialogAction>
                                                Editar
                                            </AlertDialogAction> */}
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Encabezado */}
                                <div className="flex items-start justify-between gap-4 pr-8">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold">
                                            {inc.name}
                                        </h3>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {inc.category_name}
                                        </p>
                                    </div>

                                    {/* Estado */}
                                    <span
                                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                                            inc.state === "Pendiente"
                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        }`}
                                    >
                                        {inc.state}
                                    </span>
                                </div>

                                {/* Monto */}
                                <div className="mt-5">
                                    <p className="text-sm text-muted-foreground">
                                        Monto
                                    </p>

                                    <p className="mt-1 text-2xl font-bold">
                                        {formatMoneyCol(inc.amount)}
                                    </p>
                                </div>

                                {/* Acción */}
                                <div className="mt-5 border-t pt-4">
                                    {inc.state === "Pendiente" ? (
                                        <Button
                                            className="w-full"
                                            onClick={() => handleCheckpay(inc)}
                                        >
                                            Pagar
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                ✓
                                            </span>

                                            Gasto pagado
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Gastos pendientes de meses anteriores */}
            {periodExpensesNoPayed.length === 0 ? null : (
                <section className="space-y-4">
                    <div>
                        <h2 className="text-xl font-semibold">
                            Gastos Pendientes
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Consulta y administra los gastos que quedaron pendientes
                            de pagar de meses anteriores.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {periodExpensesNoPayed.map((inc) => (
                            <div
                                key={inc.id}
                                className="relative rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                            >
                                {/* Botón eliminar */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"default"}
                                            size="icon"
                                            className="absolute right-3 top-3 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            title="Eliminar gasto"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Estas seguro que deseas eliminar el gasto?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción es irreversible. Esto eliminará permanentemente su
                                            cuenta de nuestros servidores.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePeriodExpense(inc.id)}>Continuar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Botón de informacion */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"default"}
                                            size="icon"
                                            className="absolute right-3 top-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            title="Ver información del gasto"
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent className="max-w-lg">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-xl">
                                                Información del gasto
                                            </AlertDialogTitle>

                                            <AlertDialogDescription>
                                                Consulta todos los detalles del gasto seleccionado.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        {/* Información del gasto */}
                                        <div className="space-y-4">
                                            {/* Nombre */}
                                            <div className="rounded-lg border bg-muted/30 p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Gasto
                                                </p>

                                                <p className="mt-1 text-lg font-semibold">
                                                    {inc.name ?? "-"}
                                                </p>
                                            </div>

                                            {/* Información principal */}
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {/* Monto */}
                                                <div className="rounded-lg border p-4">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Monto
                                                    </p>

                                                    <p className="mt-1 text-xl font-bold">
                                                        {Number(inc.amount).toLocaleString(
                                                            "es-CO",
                                                            {
                                                                style: "currency",
                                                                currency: "COP",
                                                                minimumFractionDigits: 0,
                                                            }
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Estado */}
                                                <div className="rounded-lg border p-4">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Estado
                                                    </p>

                                                    <div className="mt-2">
                                                        <span
                                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                                                inc.state === "Pendiente"
                                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                            }`}
                                                        >
                                                            {inc.state}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fecha */}
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Fecha del gasto
                                                </p>

                                                <p className="mt-1 text-sm font-medium">
                                                    {inc.expense_date
                                                        ? new Date(
                                                            inc.expense_date
                                                        ).toLocaleDateString("es-CO", {
                                                            day: "2-digit",
                                                            month: "long",
                                                            year: "numeric",
                                                        })
                                                        : "-"}
                                                </p>
                                            </div>

                                            {/* Categoría */}
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Categoría
                                                </p>

                                                <p className="mt-1 text-sm font-medium">
                                                    {inc.category_name ?? "-"} ({getCategoryTypeLabel(inc.category_type)})
                                                </p>
                                            </div>

                                            {/* Descripción */}
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Descripción
                                                </p>

                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {inc.description || "Sin descripción"}
                                                </p>
                                            </div>
                                        </div>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cerrar
                                            </AlertDialogCancel>

                                            {/* <AlertDialogAction>
                                                Editar
                                            </AlertDialogAction> */}
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Botón editar */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"default"}
                                            size="icon"
                                            className="absolute right-3 top-15 rounded-full text-muted-foreground hover:bg-chart-2/10 hover:text-chart-2"
                                            title="Ver información del gasto"
                                            onClick={() => setExpensePeriodToEdit(inc)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent className="max-w-lg">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-xl">
                                                Información del gasto
                                            </AlertDialogTitle>

                                            <AlertDialogDescription>
                                                Consulta todos los detalles del gasto seleccionado.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        {/* edicion del gasto */}
                                        <FormPeriodExpense createPeriodExpense={handleCreatePeriodExpense} periodExpenseToEdit={expensePeriodToEdit} UpdatePeriodExpense={handleUpdatePeriodExpense}/>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cerrar
                                            </AlertDialogCancel>

                                            {/* <AlertDialogAction>
                                                Editar
                                            </AlertDialogAction> */}
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Encabezado */}
                                <div className="flex items-start justify-between gap-4 pr-8">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold">
                                            {inc.name}
                                        </h3>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Gasto pendiente
                                        </p>
                                    </div>

                                    {/* Estado */}
                                    <span className="shrink-0 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                                        {inc.state}
                                    </span>
                                </div>

                                {/* Monto */}
                                <div className="mt-5">
                                    <p className="text-sm text-muted-foreground">
                                        Monto pendiente
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-destructive">
                                        {formatMoneyCol(inc.amount)}
                                    </p>
                                </div>

                                {/* Acción */}
                                <div className="mt-5 border-t pt-4">
                                    {inc.state === "Pendiente" ? (
                                        <Button
                                            className="w-full"
                                            size="sm"
                                            onClick={() => handleCheckpay(inc)}
                                        >
                                            Pagar gasto
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                ✓
                                            </span>

                                            Gasto pagado
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>

        {/* Loader coin */}
        {loading && (
            <Loader/>
        )}
    </div>
);
}