import * as React from "react";
import { MONTH_SHORT } from "@/lib/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportMonth } from "@/types";

const SERIES = [
    { key: "income", label: "Ingresos", color: "var(--series-income)" },
    { key: "expenses", label: "Gastos", color: "var(--series-expense)" },
    { key: "savings", label: "Ahorro", color: "var(--series-saving)" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

function niceMax(value: number) {
    if (value <= 0) return 100_000;
    const exp = Math.pow(10, Math.floor(Math.log10(value)));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= value / 4)! * exp;
    return Math.ceil(value / step) * step;
}

/** Barra con esquinas superiores redondeadas (4 px) anclada a la línea base. */
function barPath(x: number, y: number, w: number, h: number) {
    const r = Math.min(4, w / 2, h);
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Barras agrupadas por mes (ingresos, gastos y ahorro) en un solo eje en pesos.
 * Tooltip al pasar por cada mes, leyenda siempre visible y alternativa en tabla.
 */
export function MonthlyChart({ months, height = 280 }: { months: ReportMonth[]; height?: number }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [width, setWidth] = React.useState(720);
    const [active, setActive] = React.useState<number | null>(null);

    React.useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const margin = { top: 12, right: 8, bottom: 30, left: 62 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const max = niceMax(Math.max(...months.flatMap((m) => SERIES.map((s) => Number(m[s.key as SeriesKey]) || 0))));
    const y = (v: number) => innerH - (Math.max(v, 0) / max) * innerH;
    const band = innerW / months.length;
    const barW = Math.max(4, Math.min(16, (band * 0.72 - 4) / 3));
    const groupW = barW * 3 + 4;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
    const point = active !== null ? months[active] : null;

    return (
        <div ref={ref} className="relative w-full select-none">
            <svg width={width} height={height} role="img" aria-label="Ingresos, gastos y ahorro por mes" className="overflow-visible">
                <g transform={`translate(${margin.left},${margin.top})`}>
                    {ticks.map((tick) => (
                        <g key={tick} transform={`translate(0,${y(tick)})`}>
                            <line x1={0} x2={innerW} stroke="var(--border)" strokeDasharray={tick === 0 ? undefined : "3 4"} />
                            <text x={-10} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular">
                                {tick === 0 ? "0" : formatMoneyCompact(tick).replace("$ ", "$")}
                            </text>
                        </g>
                    ))}

                    {months.map((m, i) => {
                        const x0 = i * band + (band - groupW) / 2;
                        const dim = active !== null && active !== i;
                        return (
                            <g key={`${m.year}-${m.month}`} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 150ms" }}>
                                {SERIES.map((s, k) => {
                                    const value = Number(m[s.key as SeriesKey]) || 0;
                                    if (value <= 0) return null;
                                    const top = y(value);
                                    return <path key={s.key} d={barPath(x0 + k * (barW + 2), top, barW, innerH - top)} fill={s.color} className="animate-fade-in" />;
                                })}
                                <text x={i * band + band / 2} y={innerH + 20} textAnchor="middle" className={cn("text-[11px]", active === i ? "fill-foreground font-semibold" : "fill-muted-foreground")}>
                                    {MONTH_SHORT[m.month - 1]}
                                    {m.month === 1 || i === 0 ? ` ${String(m.year).slice(2)}` : ""}
                                </text>
                                <rect
                                    x={i * band}
                                    y={0}
                                    width={band}
                                    height={innerH + 24}
                                    fill="transparent"
                                    onMouseEnter={() => setActive(i)}
                                    onMouseLeave={() => setActive(null)}
                                    onFocus={() => setActive(i)}
                                    onBlur={() => setActive(null)}
                                    tabIndex={0}
                                    aria-label={`${m.label}: ingresos ${formatMoney(m.income)}, gastos ${formatMoney(m.expenses)}, ahorro ${formatMoney(m.savings)}`}
                                />
                            </g>
                        );
                    })}
                </g>
            </svg>

            {point && active !== null && (
                <div
                    className="pointer-events-none absolute top-2 z-10 w-52 rounded-xl border bg-popover p-3 text-xs shadow-lift animate-fade-in"
                    style={{ left: Math.min(Math.max(margin.left + active * band + band / 2 - 104, 0), width - 208) }}
                >
                    <p className="mb-2 text-sm font-semibold">{point.label}</p>
                    {SERIES.map((s) => (
                        <p key={s.key} className="flex items-center justify-between gap-3 py-0.5">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                                {s.label}
                            </span>
                            <span className="font-medium tabular">{formatMoney(Number(point[s.key as SeriesKey]))}</span>
                        </p>
                    ))}
                    <p className="mt-1.5 flex justify-between border-t pt-1.5 font-semibold">
                        <span>Balance</span>
                        <span className={cn("tabular", point.balance < 0 && "text-destructive")}>{formatMoney(point.balance)}</span>
                    </p>
                </div>
            )}

            <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground" aria-hidden="true">
                {SERIES.map((s) => (
                    <span key={s.key} className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
