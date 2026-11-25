import * as React from "react";
import { cn } from "@/lib/utils";
import { formatThousands, parseMoneyInput } from "@/lib/format";
import { inputClasses } from "@/components/ui/input";

type MoneyInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
    value: number | null;
    onValueChange: (value: number | null) => void;
};

/** Campo de pesos colombianos: formatea con puntos de miles mientras se escribe ($ 1.250.000). */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
    { value, onValueChange, className, ...props },
    ref
) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-muted-foreground">$</span>
            <input
                ref={ref}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={cn(inputClasses, "pl-8 tabular font-medium", className)}
                value={formatThousands(value)}
                onChange={(event) => onValueChange(parseMoneyInput(event.target.value))}
                {...props}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-muted-foreground">COP</span>
        </div>
    );
});
