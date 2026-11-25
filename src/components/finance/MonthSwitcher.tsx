import { ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import { addMonths, compareYM, monthLabel, type YearMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Props = {
    value: YearMonth;
    current: YearMonth;
    onChange: (value: YearMonth) => void;
    className?: string;
};

export function MonthSwitcher({ value, current, onChange, className }: Props) {
    const diff = compareYM(value, current);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="flex items-center rounded-2xl border bg-card p-1 shadow-soft">
                <button
                    type="button"
                    onClick={() => onChange(addMonths(value, -1))}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
                    aria-label="Mes anterior"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <div key={`${value.year}-${value.month}`} className="min-w-36 px-2 text-center animate-fade-in" aria-live="polite">
                    <p className="text-sm font-semibold capitalize">{monthLabel(value)}</p>
                    <p className="text-[11px] text-muted-foreground">
                        {diff === 0 ? "Mes actual" : diff > 0 ? `En ${diff} mes${diff === 1 ? "" : "es"}` : `Hace ${-diff} mes${diff === -1 ? "" : "es"}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onChange(addMonths(value, 1))}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
                    aria-label="Mes siguiente"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
            {diff !== 0 && (
                <button
                    type="button"
                    onClick={() => onChange(current)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-2xl border bg-card px-3 text-sm font-medium shadow-soft transition hover:bg-muted animate-scale-in"
                >
                    <CalendarCheck className="size-4 text-primary" />
                    Hoy
                </button>
            )}
        </div>
    );
}
