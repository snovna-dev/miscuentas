import { currentYearMonth, DEFAULT_TIMEZONE, todayISO } from "@/lib/dates";

/** Zona horaria de negocio. Evita que un servidor en UTC cambie de mes 5 horas antes que Colombia. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;

export function serverToday() {
    return todayISO(APP_TIMEZONE);
}

export function serverCurrentMonth() {
    return currentYearMonth(APP_TIMEZONE);
}
