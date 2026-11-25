import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------- Card ---------------------------------- */

export function Card({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-soft", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("flex flex-col gap-1 p-5 pb-0 sm:p-6 sm:pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
    return <h3 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
    return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

/* ---------------------------------- Badge --------------------------------- */

const badgeTones = {
    neutral: "bg-muted text-muted-foreground",
    brand: "bg-primary/12 text-primary",
    success: "bg-success/14 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    danger: "bg-destructive/12 text-destructive",
    info: "bg-info/14 text-info",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "neutral", className, ...props }: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
    return (
        <span
            className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", badgeTones[tone], className)}
            {...props}
        />
    );
}

/* -------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
    return <div aria-hidden="true" className={cn("skeleton h-4 w-full", className)} {...props} />;
}

/* -------------------------------- Progress -------------------------------- */

export function Progress({
    value,
    className,
    barClassName,
    label,
}: {
    value: number;
    className?: string;
    barClassName?: string;
    label?: string;
}) {
    const safe = Math.max(0, Math.min(100, value));
    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(safe)}
            aria-label={label}
            className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
        >
            <div
                className={cn("h-full rounded-full bg-primary transition-[width] duration-700 ease-out", barClassName)}
                style={{ width: `${safe}%` }}
            />
        </div>
    );
}

/* ------------------------------- EmptyState ------------------------------- */

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: React.ReactNode;
    title: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center animate-fade-in", className)}>
            {icon && (
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-7 animate-float">
                    {icon}
                </div>
            )}
            <p className="font-semibold">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

/* ------------------------------- PageHeader ------------------------------- */

export function PageHeader({
    title,
    description,
    eyebrow,
    actions,
    className,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    eyebrow?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up", className)}>
            <div className="space-y-1">
                {eyebrow && <div className="text-sm font-medium text-primary">{eyebrow}</div>}
                <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
                {description && <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/* ------------------------------ Segmented tabs ---------------------------- */

export function Segmented<T extends string>({
    value,
    onChange,
    options,
    className,
    label,
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string; count?: number }[];
    className?: string;
    label: string;
}) {
    return (
        <div role="tablist" aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1", className)}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
                            active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {option.label}
                        {option.count !== undefined && (
                            <span className={cn("rounded-full px-1.5 text-[11px] tabular", active ? "bg-primary/12 text-primary" : "bg-foreground/8")}>
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
