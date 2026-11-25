import { AlertTriangle, CheckCircle2, Flame } from "lucide-react";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { formatMoney, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function budgetTone(budget: number | null, spent: number) {
    if (!budget) return { level: "none" as const, bar: "bg-muted-foreground/40", text: "text-muted-foreground", label: "Sin presupuesto" };
    const ratio = spent / budget;
    if (ratio > 1) return { level: "exceeded" as const, bar: "bg-destructive", text: "text-destructive", label: "Superado" };
    if (ratio >= 0.8) return { level: "warning" as const, bar: "bg-warning", text: "text-warning-foreground", label: "Casi agotado" };
    return { level: "ok" as const, bar: "bg-success", text: "text-success", label: "Dentro del presupuesto" };
}

/** Fila compacta de presupuesto (tablero). */
export function BudgetBar({ name, budget, spent }: { name: string; budget: number; spent: number }) {
    const tone = budgetTone(budget, spent);
    const share = percent(spent, budget);
    const Icon = tone.level === "exceeded" ? Flame : tone.level === "warning" ? AlertTriangle : CheckCircle2;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 text-sm">
                <CategoryIcon name={name} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                <Icon className={cn("size-4", tone.text)} aria-label={tone.label} />
                <span className="tabular text-xs text-muted-foreground">
                    {formatMoney(spent)} / {formatMoney(budget)}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} aria-label={`${name}: ${share}% usado`}>
                <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tone.bar)} style={{ width: `${Math.max(share, 2)}%` }} />
            </div>
        </div>
    );
}
