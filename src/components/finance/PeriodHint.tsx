import { CalendarClock, CalendarDays, History, Repeat } from "lucide-react";
import { monthLabel, parseISODate, relativeMonth } from "@/lib/dates";
import { useCurrentMonth } from "@/contexts/TodayContext";
import { cn } from "@/lib/utils";

/**
 * Muestra en vivo en qué mes quedará registrado el gasto según la fecha elegida.
 * Si la fecha es superior a hoy, avisa que se registrará en ese mes futuro.
 */
/** `recurring`: texto de frecuencia ("cada mes", "cada año"…) si el gasto se repite. */
export function PeriodHint({ date, recurring = false, className }: { date: string; recurring?: boolean | string; className?: string }) {
    const current = useCurrentMonth();
    const parts = parseISODate(date);
    if (!parts) return null;

    const target = { year: parts.year, month: parts.month };
    const relative = relativeMonth(target, current);
    const label = monthLabel(target);

    const config = {
        current: {
            icon: CalendarDays,
            tone: "border-primary/20 bg-primary/6 text-foreground",
            iconTone: "text-primary",
            text: <>Se registrará en el mes actual: <strong className="font-semibold">{label}</strong></>,
        },
        future: {
            icon: CalendarClock,
            tone: "border-info/30 bg-info/8 text-foreground",
            iconTone: "text-info",
            text: <>Fecha futura: quedará registrado en <strong className="font-semibold">{label}</strong> y no afectará el mes actual.</>,
        },
        past: {
            icon: History,
            tone: "border-warning/40 bg-warning/12 text-foreground",
            iconTone: "text-warning-foreground",
            text: <>Fecha pasada: se registrará en <strong className="font-semibold">{label}</strong> como pendiente.</>,
        },
    }[relative];

    const Icon = config.icon;

    return (
        <div key={`${relative}-${label}`} className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs leading-relaxed animate-scale-in", config.tone, className)}>
            <Icon className={cn("mt-px size-4 shrink-0", config.iconTone)} />
            <div className="space-y-0.5">
                <p>{config.text}</p>
                {recurring && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                        <Repeat className="size-3" /> Se repetirá automáticamente {typeof recurring === "string" ? recurring : "cada mes"} desde {label}.
                    </p>
                )}
            </div>
        </div>
    );
}
