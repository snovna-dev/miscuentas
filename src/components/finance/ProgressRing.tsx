import { cn } from "@/lib/utils";

/** Anillo de progreso animado (metas de ahorro). */
export function ProgressRing({
    value,
    size = 96,
    stroke = 10,
    color = "var(--primary)",
    className,
    children,
}: {
    value: number;
    size?: number;
    stroke?: number;
    color?: string;
    className?: string;
    children?: React.ReactNode;
}) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const safe = Math.max(0, Math.min(100, value));
    return (
        <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(safe)}% completado`}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - safe / 100)}
                    style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
        </div>
    );
}
