import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { Check, MoreHorizontal, Pencil, Repeat, Trash2, Undo2 } from "lucide-react";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { Badge } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/spinner";
import { daysFromToday, formatDateShort, monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExpenseCategoryType } from "@/emuns/ExpenseCategoryType";
import { ExpenseState } from "@/emuns/ExpenseState";
import type { PeriodExpense } from "@/types";

type Props = {
    expense: PeriodExpense;
    today: string;
    variant?: "default" | "overdue" | "upcoming";
    busy?: boolean;
    onTogglePaid?: (expense: PeriodExpense) => void;
    onEdit?: (expense: PeriodExpense) => void;
    onDelete?: (expense: PeriodExpense) => void;
};

function dueLabel(expense: PeriodExpense, today: string) {
    const days = daysFromToday(expense.expense_date.slice(0, 10), today);
    if (days === 0) return { text: "Vence hoy", tone: "warning" as const };
    if (days === 1) return { text: "Vence mañana", tone: "warning" as const };
    if (days > 1 && days <= 5) return { text: `Vence en ${days} días`, tone: "warning" as const };
    if (days < 0) return { text: `Venció hace ${-days} día${days === -1 ? "" : "s"}`, tone: "danger" as const };
    return null;
}

export function ExpenseItem({ expense, today, variant = "default", busy = false, onTogglePaid, onEdit, onDelete }: Props) {
    const paid = Number(expense.state_id) === ExpenseState.PAID;
    const fixed = Number(expense.category_type) === ExpenseCategoryType.FIXED;
    const due = !paid && variant !== "upcoming" ? dueLabel(expense, today) : null;

    return (
        <li
            className={cn(
                "group flex items-center gap-3 px-4 py-3.5 transition-colors sm:gap-4 sm:px-5",
                paid ? "bg-transparent" : "hover:bg-muted/40",
                variant === "overdue" && "bg-destructive/[0.03]"
            )}
        >
            <CategoryIcon name={expense.category_name} className={cn(paid && "opacity-50 grayscale")} />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className={cn("truncate font-medium", paid && "text-muted-foreground line-through decoration-foreground/30")}>{expense.name}</p>
                    {fixed && <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-label="Gasto fijo" />}
                    {expense.installment_number && expense.installments_total ? (
                        <Badge tone="brand" className="py-0 text-[11px]">
                            Cuota {expense.installment_number}/{expense.installments_total}
                        </Badge>
                    ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{expense.category_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{variant === "default" ? formatDateShort(expense.expense_date) : `${formatDateShort(expense.expense_date)} · ${monthLabel(expense)}`}</span>
                    {due && <Badge tone={due.tone} className="py-0 text-[11px]">{due.text}</Badge>}
                    {variant === "upcoming" && <Badge tone="info" className="py-0 text-[11px]">Programado</Badge>}
                </div>
            </div>

            <div className="text-right">
                <p className={cn("font-semibold tabular", paid ? "text-muted-foreground" : variant === "overdue" ? "text-destructive" : "")}>
                    {formatMoney(expense.amount)}
                </p>
                <p className={cn("max-w-[8rem] truncate text-[11px] font-medium", paid ? "text-success" : "text-muted-foreground")}>
                    {paid ? (expense.paid_account_name ? `Pagado · ${expense.paid_account_name}` : "Pagado") : "Pendiente"}
                </p>
            </div>

            {onTogglePaid && (
                <button
                    type="button"
                    onClick={() => onTogglePaid(expense)}
                    disabled={busy}
                    aria-label={paid ? `Marcar ${expense.name} como pendiente` : `Marcar ${expense.name} como pagado`}
                    title={paid ? "Marcar como pendiente" : "Marcar como pagado"}
                    className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 active:scale-90",
                        paid
                            ? "border-success bg-success text-white shadow-[0_4px_14px_-4px_var(--success)]"
                            : "border-border text-muted-foreground hover:border-success hover:bg-success/10 hover:text-success"
                    )}
                >
                    {busy ? (
                        <Spinner className="size-4" />
                    ) : paid ? (
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path className="check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                    ) : (
                        <Check className="size-4 opacity-60" />
                    )}
                </button>
            )}

            {(onEdit || onDelete) && (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button
                            type="button"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label={`Opciones de ${expense.name}`}
                        >
                            <MoreHorizontal className="size-4" />
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            align="end"
                            sideOffset={6}
                            className="z-50 min-w-44 rounded-2xl border bg-popover p-1.5 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                        >
                            {onTogglePaid && (
                                <DropdownMenu.Item
                                    onSelect={() => onTogglePaid(expense)}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
                                >
                                    {paid ? <Undo2 className="size-4" /> : <Check className="size-4" />}
                                    {paid ? "Marcar pendiente" : "Marcar pagado"}
                                </DropdownMenu.Item>
                            )}
                            {onEdit && (
                                <DropdownMenu.Item
                                    onSelect={() => onEdit(expense)}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
                                >
                                    <Pencil className="size-4" /> Editar
                                </DropdownMenu.Item>
                            )}
                            {onDelete && (
                                <DropdownMenu.Item
                                    onSelect={() => onDelete(expense)}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10"
                                >
                                    <Trash2 className="size-4" /> Eliminar
                                </DropdownMenu.Item>
                            )}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            )}
        </li>
    );
}

export function ExpenseListSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <ul className="divide-y" aria-hidden="true">
            {Array.from({ length: rows }).map((_, index) => (
                <li key={index} className="flex items-center gap-4 px-5 py-4">
                    <div className="skeleton size-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-2/5" />
                        <div className="skeleton h-3 w-1/4" />
                    </div>
                    <div className="skeleton h-5 w-20" />
                    <div className="skeleton size-9 rounded-full" />
                </li>
            ))}
        </ul>
    );
}
