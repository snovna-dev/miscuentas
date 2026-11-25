const copFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** $ 1.250.000 — siempre muestra un valor (0 incluido). */
export function formatMoney(amount: number | string | null | undefined) {
    const value = Number(amount ?? 0);
    return copFormatter.format(Number.isFinite(value) ? value : 0);
}

/** $ 1,2 M / $ 850 mil — para gráficos y espacios reducidos. */
export function formatMoneyCompact(amount: number) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}$ ${(abs / 1_000_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil M`;
    if (abs >= 1_000_000) return `${sign}$ ${(abs / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
    if (abs >= 1_000) return `${sign}$ ${(abs / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 0 })} mil`;
    return formatMoney(amount);
}

/** 1.250.000 (sin símbolo), usado por los campos de dinero. */
export function formatThousands(amount: number | null | undefined) {
    if (amount === null || amount === undefined || Number.isNaN(amount)) return "";
    return numberFormatter.format(amount);
}

/** Convierte lo que escribe el usuario ("1.250.000", "$ 1,250,000") a número. */
export function parseMoneyInput(raw: string): number | null {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    const value = Number(digits.slice(0, 15));
    return Number.isFinite(value) ? value : null;
}

export function percent(part: number, total: number) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function initials(name: string | null | undefined) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
