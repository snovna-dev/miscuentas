import { formatDateShort } from "@/lib/dates";

/** Fechas ISO completas (created_at) o YYYY-MM-DD → "24 nov 2025". */
export function formatNumericDate(value: string | null | undefined) {
    if (!value) return "—";
    const date = new Date(value);
    if (value.length > 10 && !Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
    }
    return formatDateShort(value);
}
