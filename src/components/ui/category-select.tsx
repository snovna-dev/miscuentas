import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClasses } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import type { Category } from "@/types";

type Option = { value: string; label: string; description?: string | null; icon?: React.ReactNode };

type SelectFieldProps = {
    id?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    loading?: boolean;
};

/** Select accesible con el estilo de los campos (Radix). */
export function SelectField({ id, value, onValueChange, options, placeholder = "Selecciona…", disabled, invalid, loading }: SelectFieldProps) {
    if (loading) return <Skeleton className="h-11 rounded-xl" />;

    return (
        <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
            <SelectPrimitive.Trigger
                id={id}
                aria-invalid={invalid || undefined}
                className={cn(inputClasses, "flex items-center justify-between gap-2 text-left data-[placeholder]:text-muted-foreground/70")}
            >
                <SelectPrimitive.Value placeholder={placeholder} />
                <SelectPrimitive.Icon>
                    <ChevronDown className="size-4 opacity-60" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={6}
                    className="z-[60] max-h-[min(22rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                    <SelectPrimitive.Viewport className="p-1.5">
                        {options.map((option) => (
                            <SelectPrimitive.Item
                                key={option.value}
                                value={option.value}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-xl py-2 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-muted data-[state=checked]:font-medium"
                            >
                                {option.icon}
                                <div className="min-w-0">
                                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                                    {option.description && <p className="truncate text-xs text-muted-foreground">{option.description}</p>}
                                </div>
                                <SelectPrimitive.ItemIndicator className="absolute right-2.5">
                                    <Check className="size-4 text-primary" />
                                </SelectPrimitive.ItemIndicator>
                            </SelectPrimitive.Item>
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}

export function CategorySelect({
    categories,
    ...props
}: Omit<SelectFieldProps, "options"> & { categories: Category[] }) {
    return (
        <SelectField
            placeholder="Selecciona una categoría"
            {...props}
            options={categories.map((category) => ({
                value: String(category.id),
                label: category.name,
                description: category.description,
                icon: <CategoryIcon name={category.name} size="sm" />,
            }))}
        />
    );
}
