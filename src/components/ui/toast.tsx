import * as React from "react";
import { CheckCircle2, Info, X, XCircle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "future";

type Toast = {
    id: number;
    tone: ToastTone;
    title: string;
    description?: string;
    duration: number;
};

type ToastInput = Omit<Toast, "id" | "duration" | "tone"> & { duration?: number };

type ToastApi = {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    future: (title: string, description?: string) => void;
    show: (tone: ToastTone, toast: ToastInput) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

const toneStyles: Record<ToastTone, { icon: React.ElementType; className: string; bar: string }> = {
    success: { icon: CheckCircle2, className: "text-success", bar: "bg-success" },
    error: { icon: XCircle, className: "text-destructive", bar: "bg-destructive" },
    info: { icon: Info, className: "text-info", bar: "bg-info" },
    future: { icon: CalendarClock, className: "text-primary", bar: "bg-primary" },
};

/** Notificaciones accesibles (aria-live) que reemplazan los mensajes "Ingreso con ID X registrado". */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);
    const counter = React.useRef(0);

    const dismiss = React.useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const show = React.useCallback(
        (tone: ToastTone, input: ToastInput) => {
            const id = ++counter.current;
            const duration = input.duration ?? (tone === "error" ? 6500 : 4500);
            setToasts((current) => [...current.slice(-3), { ...input, id, tone, duration }]);
            window.setTimeout(() => dismiss(id), duration);
        },
        [dismiss]
    );

    const api = React.useMemo<ToastApi>(
        () => ({
            show,
            success: (title, description) => show("success", { title, description }),
            error: (title, description) => show("error", { title, description }),
            info: (title, description) => show("info", { title, description }),
            future: (title, description) => show("future", { title, description, duration: 6500 }),
        }),
        [show]
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div
                aria-live="polite"
                aria-relevant="additions"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:items-end"
            >
                {toasts.map((toast) => {
                    const { icon: Icon, className, bar } = toneStyles[toast.tone];
                    return (
                        <div
                            key={toast.id}
                            role={toast.tone === "error" ? "alert" : "status"}
                            className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border bg-popover p-4 pr-10 shadow-lift animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-right-8 sm:slide-in-from-bottom-0"
                        >
                            <div className="flex gap-3">
                                <Icon className={cn("mt-0.5 size-5 shrink-0 animate-pop", className)} />
                                <div className="min-w-0 space-y-0.5">
                                    <p className="text-sm font-semibold">{toast.title}</p>
                                    {toast.description && <p className="text-sm text-muted-foreground">{toast.description}</p>}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss(toast.id)}
                                className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="Cerrar notificación"
                            >
                                <X className="size-4" />
                            </button>
                            <span
                                className={cn("absolute bottom-0 left-0 h-0.5 origin-left", bar)}
                                style={{ width: "100%", animation: `toast-timer ${toast.duration}ms linear forwards` }}
                            />
                        </div>
                    );
                })}
            </div>
            <style>{`@keyframes toast-timer { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) throw new Error("useToast debe usarse dentro de <ToastProvider>");
    return context;
}
