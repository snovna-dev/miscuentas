import * as React from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, FileSpreadsheet, FileText, Minus, Table2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, buttonVariants } from "@/components/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { LogoMark } from "@/components/brand/Logo";
import { useUser } from "@/contexts/UserContext";
import { useToday } from "@/contexts/TodayContext";
import { api, errorMessage } from "@/lib/client/api";
import { formatDateLong } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { withPageAuth } from "@/lib/ssr";
import { cn } from "@/lib/utils";
import type { ReportData } from "@/types";

export const getServerSideProps = withPageAuth("user");

type Range = "3" | "6" | "12";

/** Variación porcentual vs. el mes anterior. `goodWhenUp` define si subir es bueno (ingresos) o malo (gastos). */
function Delta({ current, previous, goodWhenUp }: { current: number; previous: number; goodWhenUp: boolean }) {
    if (!previous && !current) return <span className="text-xs text-muted-foreground">Sin datos</span>;
    if (!previous) return <span className="text-xs text-muted-foreground">Nuevo este mes</span>;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    const rounded = Math.round(change);
    if (rounded === 0)
        return (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Minus className="size-3" /> Igual que el mes anterior
            </span>
        );
    const up = rounded > 0;
    const good = up === goodWhenUp;
    return (
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", good ? "text-success" : "text-destructive")}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(rounded)}% vs. mes anterior
        </span>
    );
}

export default function Reports() {
    const toast = useToast();
    const { user } = useUser();
    const today = useToday();
    const [range, setRange] = React.useState<Range>("6");
    const [view, setView] = React.useState<"chart" | "table">("chart");
    const [data, setData] = React.useState<ReportData | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let active = true;
        setLoading(true);
        api<ReportData>(`/api/reports?months=${range}`)
            .then((result) => active && setData(result))
            .catch((error) => toast.error("No pudimos generar el reporte", errorMessage(error)))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [range, toast]);

    const hasData = data && data.months.some((m) => m.income || m.expenses || m.savings);
    const cards = data
        ? [
              { label: "Ingresos", current: data.current.income, previous: data.previous.income, goodWhenUp: true, average: data.averages.income },
              { label: "Gastos", current: data.current.expenses, previous: data.previous.expenses, goodWhenUp: false, average: data.averages.expenses },
              { label: "Ahorro", current: data.current.savings, previous: data.previous.savings, goodWhenUp: true, average: data.averages.savings },
              { label: "Balance", current: data.current.balance, previous: data.previous.balance, goodWhenUp: true, average: null },
          ]
        : [];

    return (
        <AppShell title="Reportes">
            {/* Encabezado solo para el PDF */}
            <div className="print-only mb-6">
                <div className="flex items-center gap-3">
                    <LogoMark size={36} />
                    <div>
                        <p className="text-lg font-semibold">Reporte financiero · últimos {range} meses</p>
                        <p className="text-sm text-slate-500">
                            {user?.name} · generado el {formatDateLong(today)}
                        </p>
                    </div>
                </div>
            </div>

            <PageHeader
                className="no-print"
                eyebrow="Reportes"
                title="Así evolucionan tus finanzas"
                description="Compara tus ingresos, gastos y ahorro mes a mes, y descarga el reporte en Excel o PDF."
                actions={
                    <>
                        <Segmented
                            label="Rango"
                            value={range}
                            onChange={setRange}
                            options={[
                                { value: "3", label: "3 meses" },
                                { value: "6", label: "6 meses" },
                                { value: "12", label: "12 meses" },
                            ]}
                        />
                        {/* Enlace normal (no Link): es una descarga, no una navegación */}
                        <a className={buttonVariants({ variant: "outline" })} href={`/api/reports/export?months=${range}`} download>
                            <FileSpreadsheet /> Excel
                        </a>
                        <Button variant="outline" onClick={() => window.print()} disabled={!hasData}>
                            <FileText /> PDF
                        </Button>
                    </>
                }
            />

            {loading && !data ? (
                <div className="mt-6 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-28 rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-80 rounded-2xl" />
                </div>
            ) : !hasData ? (
                <div className="mt-6">
                    <EmptyState icon={<BarChart3 />} title="Aún no hay suficiente información" description="Registra ingresos y gastos durante el mes y aquí verás tu evolución." />
                </div>
            ) : (
                <div className={cn("mt-6 space-y-6 transition-opacity", loading && "opacity-60")}>
                    <section aria-label={`Comparación ${data!.current.label} vs ${data!.previous.label}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger break-inside-avoid">
                        {cards.map((card) => (
                            <div key={card.label} className="rounded-2xl border bg-card p-5 shadow-soft">
                                <p className="text-sm text-muted-foreground">
                                    {card.label} · {data!.current.label}
                                </p>
                                <p className={cn("mt-1 text-2xl font-semibold tabular", card.label === "Balance" && card.current < 0 && "text-destructive")}>{formatMoney(card.current)}</p>
                                <div className="mt-1">
                                    <Delta current={card.current} previous={card.previous} goodWhenUp={card.goodWhenUp} />
                                </div>
                                {card.average !== null && <p className="mt-1 text-xs text-muted-foreground">Promedio: {formatMoney(card.average)}/mes</p>}
                            </div>
                        ))}
                    </section>

                    <Card className="break-inside-avoid">
                        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Ingresos, gastos y ahorro por mes</CardTitle>
                                <CardDescription>
                                    {data!.months[0].label} – {data!.current.label}
                                </CardDescription>
                            </div>
                            <Segmented
                                label="Vista"
                                value={view}
                                onChange={setView}
                                className="no-print"
                                options={[
                                    { value: "chart", label: "Gráfico" },
                                    { value: "table", label: "Tabla" },
                                ]}
                            />
                        </CardHeader>
                        <CardContent>
                            <div className={cn(view === "table" && "hidden print:block")}>
                                <MonthlyChart months={data!.months} />
                            </div>
                            <div className={cn("overflow-x-auto", view === "chart" && "hidden print:block print:mt-6")}>
                                <table className="w-full min-w-[560px] text-sm">
                                    <caption className="sr-only">Detalle mensual</caption>
                                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <tr className="border-b">
                                            <th className="py-2 font-medium">Mes</th>
                                            <th className="py-2 text-right font-medium">Ingresos</th>
                                            <th className="py-2 text-right font-medium">Gastos</th>
                                            <th className="py-2 text-right font-medium">Ahorro</th>
                                            <th className="py-2 text-right font-medium">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data!.months.map((m) => (
                                            <tr key={`${m.year}-${m.month}`}>
                                                <td className="py-2.5 font-medium">{m.label}</td>
                                                <td className="py-2.5 text-right tabular">{formatMoney(m.income)}</td>
                                                <td className="py-2.5 text-right tabular">{formatMoney(m.expenses)}</td>
                                                <td className="py-2.5 text-right tabular">{formatMoney(m.savings)}</td>
                                                <td className={cn("py-2.5 text-right font-semibold tabular", m.balance < 0 && "text-destructive")}>{formatMoney(m.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="break-inside-avoid">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Table2 className="size-4 text-primary" /> Gastos por categoría
                            </CardTitle>
                            <CardDescription>
                                Total del período y cambio de {data!.previous.label} a {data!.current.label}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr className="border-b">
                                        <th className="py-2 font-medium">Categoría</th>
                                        <th className="py-2 text-right font-medium">Total {range} meses</th>
                                        <th className="py-2 text-right font-medium">{data!.previous.label}</th>
                                        <th className="py-2 text-right font-medium">{data!.current.label}</th>
                                        <th className="py-2 text-right font-medium">Cambio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data!.categories.map((c) => {
                                        const diff = c.current - c.previous;
                                        return (
                                            <tr key={c.category_name}>
                                                <td className="py-2.5">
                                                    <span className="flex items-center gap-2.5 font-medium">
                                                        <CategoryIcon name={c.category_name} size="sm" className="no-print" /> {c.category_name}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 text-right tabular">{formatMoney(c.total)}</td>
                                                <td className="py-2.5 text-right tabular text-muted-foreground">{formatMoney(c.previous)}</td>
                                                <td className="py-2.5 text-right tabular">{formatMoney(c.current)}</td>
                                                <td className={cn("py-2.5 text-right font-medium tabular", diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : "text-muted-foreground")}>
                                                    {diff === 0 ? "—" : `${diff > 0 ? "+" : "−"}${formatMoney(Math.abs(diff))}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </AppShell>
    );
}
