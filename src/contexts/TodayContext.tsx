import * as React from "react";
import { parseISODate, todayISO, type YearMonth } from "@/lib/dates";

/**
 * Fecha de "hoy" enviada por el servidor (zona horaria de negocio).
 * Servidor y navegador usan el mismo valor: sin errores de hidratación y sin que un
 * gasto quede en otro mes por la diferencia horaria (p. ej. después de las 7 p. m. en Colombia).
 */
const TodayContext = React.createContext<string | null>(null);

export function TodayProvider({ value, children }: { value?: string | null; children: React.ReactNode }) {
    return <TodayContext.Provider value={value ?? null}>{children}</TodayContext.Provider>;
}

export function useToday(): string {
    return React.useContext(TodayContext) ?? todayISO();
}

export function useCurrentMonth(): YearMonth {
    const today = useToday();
    const parts = parseISODate(today)!;
    return { year: parts.year, month: parts.month };
}
