import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = {
    label: string;
    htmlFor?: string;
    hint?: React.ReactNode;
    error?: string | null;
    required?: boolean;
    optional?: boolean;
    className?: string;
    children: React.ReactNode;
};

/** Etiqueta + control + ayuda + error, con espaciado y accesibilidad consistentes. */
export function Field({ label, htmlFor, hint, error, required, optional, className, children }: FieldProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-medium text-foreground/90">
                {label}
                {required && (
                    <span className="text-destructive" aria-hidden="true">
                        *
                    </span>
                )}
                {optional && <span className="text-xs font-normal text-muted-foreground">(opcional)</span>}
            </label>
            {children}
            {error ? (
                <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in">
                    <AlertCircle className="size-3.5" />
                    {error}
                </p>
            ) : hint ? (
                <div className="text-xs text-muted-foreground">{hint}</div>
            ) : null}
        </div>
    );
}

export function FormError({ message }: { message?: string | null }) {
    if (!message) return null;
    return (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-3 text-sm text-destructive animate-scale-in">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
