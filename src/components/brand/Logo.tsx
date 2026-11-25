import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type MarkProps = {
    size?: number;
    className?: string;
    /** Dibuja el trazo de la "M" en bucle (pantallas de carga). */
    animated?: boolean;
    title?: string;
};

/**
 * Isotipo original de MizCuentas: una "M" cuyo último trazo se convierte en una
 * flecha de crecimiento, con una moneda dorada que representa el ahorro.
 */
export function LogoMark({ size = 36, className, animated = false, title = "MizCuentas" }: MarkProps) {
    const id = useId().replace(/:/g, "");
    const bg = `mc-bg-${id}`;
    const shine = `mc-shine-${id}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            role="img"
            aria-label={title}
            className={cn("shrink-0", className)}
        >
            <defs>
                <linearGradient id={bg} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#34D399" />
                    <stop offset="0.55" stopColor="#0D9488" />
                    <stop offset="1" stopColor="#155E75" />
                </linearGradient>
                <radialGradient id={shine} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 8) rotate(50) scale(30)">
                    <stop stopColor="#fff" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
            </defs>

            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${bg})`} />
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${shine})`} />

            <g className={animated ? "logo-draw" : undefined} fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 33.5V17l10.5 10.5L34.5 16" pathLength={100} />
                <path d="M28 16h6.5v6.5" pathLength={100} />
            </g>

            <circle cx="34.5" cy="33" r="3.4" fill="#FCD34D" />
            <circle cx="34.5" cy="33" r="1.4" fill="#F59E0B" />
        </svg>
    );
}

type LogoProps = {
    size?: number;
    className?: string;
    href?: string | null;
    showText?: boolean;
    textClassName?: string;
};

export function Logo({ size = 34, className, href = "/", showText = true, textClassName }: LogoProps) {
    const content = (
        <span className={cn("group inline-flex items-center gap-2.5", className)}>
            <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                <LogoMark size={size} />
            </span>
            {showText && (
                <span className={cn("text-lg font-semibold tracking-tight text-foreground", textClassName)}>
                    Miz<span className="text-primary">Cuentas</span>
                </span>
            )}
        </span>
    );

    if (!href) return content;
    return (
        <Link href={href} aria-label="MizCuentas, ir al inicio" className="rounded-lg">
            {content}
        </Link>
    );
}
