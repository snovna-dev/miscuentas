import { addMonths, monthLabel, parseISODate, ymIndex, type YearMonth } from "@/lib/dates";

/** Frecuencias de los gastos fijos (en meses). */
export const FREQUENCIES = [
    { value: 1, label: "Mensual", short: "cada mes" },
    { value: 2, label: "Bimestral", short: "cada 2 meses" },
    { value: 3, label: "Trimestral", short: "cada 3 meses" },
    { value: 6, label: "Semestral", short: "cada 6 meses" },
    { value: 12, label: "Anual", short: "cada año" },
] as const;

export const FREQUENCY_VALUES = FREQUENCIES.map((f) => f.value);

export function frequencyLabel(months: number | null | undefined) {
    return FREQUENCIES.find((f) => f.value === Number(months ?? 1))?.label ?? `Cada ${months} meses`;
}

export function frequencyShort(months: number | null | undefined) {
    return FREQUENCIES.find((f) => f.value === Number(months ?? 1))?.short ?? `cada ${months} meses`;
}

type Schedule = { start: string; frequency?: number | null; installments?: number | null };

function startOf(schedule: Schedule): YearMonth | null {
    const parts = parseISODate(schedule.start?.slice(0, 10));
    return parts ? { year: parts.year, month: parts.month } : null;
}

/** ¿El gasto fijo se cobra en ese mes? (misma regla que el SQL de generación). */
export function isDueInMonth(schedule: Schedule, ym: YearMonth) {
    const start = startOf(schedule);
    if (!start) return false;
    const diff = ymIndex(ym) - ymIndex(start);
    const frequency = Math.max(1, Number(schedule.frequency ?? 1));
    if (diff < 0 || diff % frequency !== 0) return false;
    return schedule.installments == null || diff / frequency < Number(schedule.installments);
}

/** Número de cuota que corresponde a un mes (1 = primera). */
export function installmentNumber(schedule: Schedule, ym: YearMonth) {
    const start = startOf(schedule);
    if (!start) return null;
    return Math.floor((ymIndex(ym) - ymIndex(start)) / Math.max(1, Number(schedule.frequency ?? 1))) + 1;
}

/** Mes de la última cuota (null si es indefinido). */
export function lastInstallmentMonth(schedule: Schedule): YearMonth | null {
    const start = startOf(schedule);
    if (!start || schedule.installments == null) return null;
    return addMonths(start, (Number(schedule.installments) - 1) * Math.max(1, Number(schedule.frequency ?? 1)));
}

export function scheduleSummary(schedule: Schedule) {
    const frequency = Number(schedule.frequency ?? 1);
    const last = lastInstallmentMonth(schedule);
    const base = frequencyLabel(frequency);
    if (!last) return base;
    return `${base} · ${schedule.installments} cuota${Number(schedule.installments) === 1 ? "" : "s"} · última en ${monthLabel(last)}`;
}

/** Equivalente mensual (un SOAT anual de $600.000 = $50.000/mes). */
export function monthlyEquivalent(amount: number, frequency: number | null | undefined) {
    return Number(amount) / Math.max(1, Number(frequency ?? 1));
}

/** Fragmento SQL: índice de mes (año*12+mes-1) de una fecha TEXT 'YYYY-MM-DD'. */
export const SQL_START_INDEX = (column: string) =>
    `(CAST(LEFT(${column}, 4) AS UNSIGNED) * 12 + CAST(SUBSTRING(${column}, 6, 2) AS UNSIGNED) - 1)`;
