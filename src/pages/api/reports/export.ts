import { getReport, getReportDetail } from "@/lib/db/queries/reports";
import { apiRoute } from "@/lib/http";
import { serverCurrentMonth } from "@/lib/serverTime";
import { oneOf } from "@/lib/validation";
import { buildXlsx } from "@/lib/xlsx";
import { MONTH_NAMES, toYearMonthKey } from "@/lib/dates";

/** Descarga el reporte en Excel (.xlsx) con tres hojas: resumen, gastos e ingresos. */
export default apiRoute({
    GET: async (req, res, user) => {
        const months = oneOf(req.query.months ?? 6, [3, 6, 12] as const, "rango");
        const end = serverCurrentMonth();
        const [report, detail] = await Promise.all([getReport(user.id, end, months), getReportDetail(user.id, end, months)]);

        const file = buildXlsx([
            {
                name: "Resumen mensual",
                columns: [
                    { header: "Mes", width: 18 },
                    { header: "Ingresos", width: 16, money: true },
                    { header: "Gastos", width: 16, money: true },
                    { header: "Pagado", width: 16, money: true },
                    { header: "Ahorro", width: 16, money: true },
                    { header: "Balance", width: 16, money: true },
                ],
                rows: report.months.map((m) => [m.label, m.income, m.expenses, m.paid, m.savings, m.balance]),
            },
            {
                name: "Gastos",
                columns: [
                    { header: "Mes", width: 16 },
                    { header: "Fecha", width: 12 },
                    { header: "Gasto", width: 30 },
                    { header: "Categoría", width: 22 },
                    { header: "Tipo", width: 10 },
                    { header: "Estado", width: 12 },
                    { header: "Valor", width: 16, money: true },
                ],
                rows: detail.expenses.map((e) => [
                    `${MONTH_NAMES[e.month - 1]} ${e.year}`,
                    e.expense_date,
                    e.name,
                    e.category_name,
                    Number(e.category_type) === 1 ? "Fijo" : "Variable",
                    e.state === "Pago" ? "Pagado" : e.state,
                    Number(e.amount),
                ]),
            },
            {
                name: "Ingresos",
                columns: [
                    { header: "Fecha", width: 12 },
                    { header: "Descripción", width: 34 },
                    { header: "Valor", width: 16, money: true },
                ],
                rows: detail.incomes.map((i) => [i.income_date, i.description ?? "", Number(i.amount)]),
            },
        ]);

        const filename = `mizcuentas-reporte-${months}m-${toYearMonthKey(end)}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", String(file.length));
        res.status(200).send(file);
    },
});
