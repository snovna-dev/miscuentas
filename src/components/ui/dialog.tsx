import * as React from "react";
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/buttons";

const overlayClasses =
    "fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0";

const contentClasses = cn(
    "fixed z-50 grid w-full gap-5 border bg-popover p-6 text-popover-foreground shadow-lift outline-none",
    // Móvil: hoja inferior. Escritorio: modal centrado.
    "inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl",
    "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8 sm:data-[state=open]:slide-in-from-bottom-2 sm:data-[state=open]:zoom-in-95",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
);

/* --------------------------------- Dialog --------------------------------- */

type DialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
};

export function Dialog({ open, onOpenChange, title, description, children, className, icon }: DialogProps) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className={overlayClasses} />
                <DialogPrimitive.Content className={cn(contentClasses, className)}>
                    <div className="mx-auto -mt-2 h-1.5 w-10 rounded-full bg-muted sm:hidden" aria-hidden="true" />
                    <div className="flex items-start gap-3 pr-8">
                        {icon && <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>}
                        <div className="space-y-1">
                            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
                            {description ? (
                                <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
                            ) : (
                                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                            )}
                        </div>
                    </div>
                    {children}
                    <DialogPrimitive.Close
                        className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Cerrar"
                    >
                        <X className="size-4" />
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

/* ----------------------------- ConfirmDialog ------------------------------ */

type ConfirmDialogProps = {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "danger" | "default";
    onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
    trigger,
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    tone = "danger",
    onConfirm,
}: ConfirmDialogProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const isOpen = open ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    async function handleConfirm(event: React.MouseEvent) {
        event.preventDefault();
        setBusy(true);
        try {
            await onConfirm();
            setOpen(false);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AlertPrimitive.Root open={isOpen} onOpenChange={setOpen}>
            {trigger && <AlertPrimitive.Trigger asChild>{trigger}</AlertPrimitive.Trigger>}
            <AlertPrimitive.Portal>
                <AlertPrimitive.Overlay className={overlayClasses} />
                <AlertPrimitive.Content className={cn(contentClasses, "sm:max-w-md")}>
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex size-11 shrink-0 items-center justify-center rounded-2xl animate-pop",
                                tone === "danger" ? "bg-destructive/12 text-destructive" : "bg-primary/12 text-primary"
                            )}
                        >
                            <AlertTriangle className="size-5" />
                        </div>
                        <div className="space-y-1.5">
                            <AlertPrimitive.Title className="text-lg font-semibold tracking-tight">{title}</AlertPrimitive.Title>
                            <AlertPrimitive.Description className="text-sm text-muted-foreground">
                                {description ?? "Esta acción no se puede deshacer."}
                            </AlertPrimitive.Description>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <AlertPrimitive.Cancel asChild>
                            <Button variant="outline" disabled={busy}>
                                {cancelLabel}
                            </Button>
                        </AlertPrimitive.Cancel>
                        <AlertPrimitive.Action asChild>
                            <Button variant={tone === "danger" ? "destructive" : "default"} loading={busy} onClick={handleConfirm}>
                                {confirmLabel}
                            </Button>
                        </AlertPrimitive.Action>
                    </div>
                </AlertPrimitive.Content>
            </AlertPrimitive.Portal>
        </AlertPrimitive.Root>
    );
}
