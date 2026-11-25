import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Switch({ checked, onCheckedChange, id, label, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; label?: string; disabled?: boolean }) {
    return (
        <SwitchPrimitive.Root
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-label={label}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "bg-primary" : "bg-input"
            )}
        >
            <SwitchPrimitive.Thumb className={cn("block size-5 rounded-full bg-white shadow-md transition-transform duration-200", checked ? "translate-x-5" : "translate-x-0")} />
        </SwitchPrimitive.Root>
    );
}
