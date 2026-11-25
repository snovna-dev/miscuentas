import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(function PasswordInput(
    { className, ...props },
    ref
) {
    const [visible, setVisible] = React.useState(false);
    return (
        <div className="relative">
            <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                tabIndex={-1}
            >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
});

/** Medidor de fortaleza (alineado con la política del servidor: 8+ caracteres, letras y números). */
export function PasswordStrength({ value }: { value: string }) {
    const checks = [
        { ok: value.length >= 8, label: "8+ caracteres" },
        { ok: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value), label: "Letras" },
        { ok: /\d/.test(value), label: "Números" },
        { ok: /[^A-Za-z0-9]/.test(value) || value.length >= 12, label: "Símbolo o 12+" },
    ];
    const score = checks.filter((c) => c.ok).length;
    const colors = ["bg-destructive", "bg-destructive", "bg-warning", "bg-success", "bg-success"];
    const labels = ["Muy débil", "Débil", "Aceptable", "Segura", "Muy segura"];

    if (!value) return null;

    return (
        <div className="space-y-2 pt-1 animate-fade-in">
            <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < score ? colors[score] : "bg-muted")} />
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-medium">{labels[score]}</span>
                {checks.map((check) => (
                    <span key={check.label} className={check.ok ? "text-success" : "text-muted-foreground"}>
                        {check.ok ? "✓" : "○"} {check.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
