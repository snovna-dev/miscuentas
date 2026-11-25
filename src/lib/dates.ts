/**
 * Utilidades de fechas compartidas entre cliente y servidor.
 *
 * Todas las fechas de negocio se manejan como texto `YYYY-MM-DD` y se interpretan en
 * hora local. Nunca usamos `new Date("YYYY-MM-DD")` para mostrarlas porque JavaScript
 * las interpreta como medianoche UTC y en Colombia (UTC-5) se ven un día antes.
 */

export const MONTH_NAMES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
] as const;

export const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

export const DEFAULT_TIMEZONE = "America/Bogota";

export type YearMonth = { year: number; month: number };
export type DateParts = YearMonth & { day: number };
export type RelativeMonth = "past" | "current" | "future";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

/** Valida y separa una fecha `YYYY-MM-DD`. Devuelve `null` si no es una fecha real. */
export function parseISODate(value: unknown): DateParts | null {
    if (typeof value !== "string") return null;
    const match = ISO_DATE.exec(value.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;

    return { year, month, day };
}

/** Compatibilidad con el código anterior. */
export function getDateParts(date: string) {
    const parts = parseISODate(date);
    if (!parts) throw new Error("Fecha inválida");
    return parts;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(year: number, month: number, day: number) {
    return `${year}-${pad(month)}-${pad(day)}`;
}

export function toYearMonthKey({ year, month }: YearMonth) {
    return `${year}-${pad(month)}`;
}

/** Fecha de hoy en `YYYY-MM-DD`. Con `timeZone` usa esa zona; sin ella, la hora local. */
export function todayISO(timeZone?: string) {
    if (timeZone) {
        // en-CA formatea como YYYY-MM-DD
        return new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
    }

    const now = new Date();
    return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function currentYearMonth(timeZone?: string): YearMonth {
    const { year, month } = parseISODate(todayISO(timeZone))!;
    return { year, month };
}

export function ymIndex({ year, month }: YearMonth) {
    return year * 12 + (month - 1);
}

export function compareYM(a: YearMonth, b: YearMonth) {
    return ymIndex(a) - ymIndex(b);
}

export function addMonths({ year, month }: YearMonth, amount: number): YearMonth {
    const index = ymIndex({ year, month }) + amount;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function relativeMonth(target: YearMonth, reference: YearMonth): RelativeMonth {
    const diff = compareYM(target, reference);
    if (diff === 0) return "current";
    return diff > 0 ? "future" : "past";
}

export function monthLabel({ year, month }: YearMonth) {
    return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Ajusta un día al mes destino (ej. 31 → 30 en noviembre). */
export function clampDateToMonth(day: number, year: number, month: number) {
    return toISODate(year, month, Math.min(Math.max(day, 1), daysInMonth(year, month)));
}

function toLocalDate(iso: string) {
    const parts = parseISODate(iso?.slice(0, 10));
    if (!parts) return null;
    return new Date(parts.year, parts.month - 1, parts.day);
}

/** "24 de noviembre de 2026" */
export function formatDateLong(iso: string | null | undefined) {
    if (!iso) return "—";
    const date = toLocalDate(iso);
    if (!date) return "—";
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/** "24 nov" (+ año si no es el actual) */
export function formatDateShort(iso: string | null | undefined) {
    if (!iso) return "—";
    const parts = parseISODate(iso.slice(0, 10));
    if (!parts) return "—";
    const sameYear = parts.year === new Date().getFullYear();
    return `${parts.day} ${MONTH_SHORT[parts.month - 1]}${sameYear ? "" : ` ${parts.year}`}`;
}

export function weekdayName(iso: string) {
    const date = toLocalDate(iso);
    if (!date) return "";
    return date.toLocaleDateString("es-CO", { weekday: "long" });
}

/** Días entre hoy y la fecha (negativo = ya pasó). */
export function daysFromToday(iso: string, today = todayISO()) {
    const a = toLocalDate(today);
    const b = toLocalDate(iso);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
