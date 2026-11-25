import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClasses = cn(
    "h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground shadow-xs outline-none",
    "placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] duration-200",
    "hover:border-foreground/25",
    "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20",
    "disabled:cursor-not-allowed disabled:opacity-60",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/15"
);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input({ className, type, ...props }, ref) {
    return <input ref={ref} type={type} data-slot="input" className={cn(inputClasses, className)} {...props} />;
});

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} data-slot="textarea" className={cn(inputClasses, "min-h-20 resize-y py-2.5", className)} {...props} />;
});

export { Input, Textarea };
