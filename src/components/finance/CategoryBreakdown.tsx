import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { formatMoney, percent } from "@/lib/format";

type Item = { category_name: string; amount: number };

const BAR_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-chart-6"];

/** Distribución del gasto del mes por categoría (barras horizontales). */
export function CategoryBreakdown({ items, limit = 6 }: { items: Item[]; limit?: number }) {
    const totals = new Map<string, number>();
    for (const item of items) totals.set(item.category_name, (totals.get(item.category_name) ?? 0) + Number(item.amount));

    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((acc, [, value]) => acc + value, 0);
    const top = sorted.slice(0, limit);
    const rest = sorted.slice(limit).reduce((acc, [, value]) => acc + value, 0);
    if (rest > 0) top.push(["Otras categorías", rest]);

    if (top.length === 0) {
        return <p className="py-6 text-center text-sm text-muted-foreground">Cuando registres gastos verás aquí en qué se va tu dinero.</p>;
    }

    return (
        <ul className="space-y-3.5 stagger">
            {top.map(([name, value], index) => {
                const share = percent(value, total);
                return (
                    <li key={name} className="space-y-1.5">
                        <div className="flex items-center gap-2.5 text-sm">
                            <CategoryIcon name={name} size="sm" />
                            <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                            <span className="tabular text-muted-foreground">{share}%</span>
                            <span className="w-28 text-right font-medium tabular">{formatMoney(value)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]} transition-[width] duration-1000 ease-out`}
                                style={{ width: `${Math.max(share, 2)}%` }}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
