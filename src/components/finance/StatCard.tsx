import * as React from "react";
import { cn } from "@/lib/utils";
import { AnimatedMoney } from "@/components/finance/AnimatedNumber";
import { Skeleton } from "@/components/ui/primitives";

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const tones: Record<Tone, string> = {
    brand: "bg-primary/12 text-primary",
    success: "bg-success/14 text-success",
    warning: "bg-warning/22 text-warning-foreground",
    danger: "bg-destructive/12 text-destructive",
    info: "bg-info/14 text-info",
    neutral: "bg-muted text-muted-foreground",
};

type StatCardProps = {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone?: Tone;
    hint?: React.ReactNode;
    loading?: boolean;
    className?: string;
    valueClassName?: string;
    children?: React.ReactNode;
};

export function StatCard({ label, value, icon, tone = "brand", hint, loading, className, valueClassName, children }: StatCardProps) {
    return (
        <div className={cn("group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift", className)}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <span className={cn("flex size-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 [&_svg]:size-[18px]", tones[tone])}>
                    {icon}
                </span>
            </div>
            {loading ? (
                <Skeleton className="mt-3 h-8 w-36" />
            ) : (
                <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular sm:text-[28px]", valueClassName)}>
                    <AnimatedMoney value={value} />
                </p>
            )}
            {hint && <div className="mt-1 text-xs text-muted-foreground">{loading ? <Skeleton className="h-3 w-24" /> : hint}</div>}
            {children}
        </div>
    );
}
