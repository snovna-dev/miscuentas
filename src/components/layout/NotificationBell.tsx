import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Popover } from "radix-ui";
import { AlertTriangle, Bell, BellRing, CalendarClock, CheckCircle2, MailWarning, PiggyBank } from "lucide-react";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

const ICONS: Record<AppNotification["kind"], React.ElementType> = {
    overdue: AlertTriangle,
    due: CalendarClock,
    budget: PiggyBank,
    verify: MailWarning,
    goal: CheckCircle2,
};

const TONES: Record<AppNotification["severity"], string> = {
    danger: "bg-destructive/12 text-destructive",
    warning: "bg-warning/22 text-warning-foreground",
    info: "bg-info/14 text-info",
    success: "bg-success/14 text-success",
};

const BROWSER_KEY = "mc-browser-notified";

/** Avisa con una notificación del sistema (si el usuario la activó) una vez por sesión. */
function notifyBrowser(items: AppNotification[]) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    const urgent = items.filter((i) => i.kind === "overdue" || i.kind === "due");
    if (urgent.length === 0) return;
    try {
        if (sessionStorage.getItem(BROWSER_KEY)) return;
        sessionStorage.setItem(BROWSER_KEY, "1");
    } catch {
        return;
    }
    new Notification("MizCuentas · pagos pendientes", {
        body: urgent.slice(0, 3).map((i) => `• ${i.title}`).join("\n") + (urgent.length > 3 ? `\n… y ${urgent.length - 3} más` : ""),
        icon: "/logo.svg",
        tag: "mc-due",
    });
}

/** Campana con recordatorios de vencimientos, presupuestos y avisos de la cuenta. */
export function NotificationBell() {
    const router = useRouter();
    const [items, setItems] = React.useState<AppNotification[]>([]);
    const [open, setOpen] = React.useState(false);

    const load = React.useCallback(async () => {
        try {
            const data = await api<{ notifications: AppNotification[] }>("/api/notifications");
            setItems(data.notifications);
            notifyBrowser(data.notifications);
        } catch {
            // Silencioso: la campana no debe interrumpir la navegación.
        }
    }, []);

    React.useEffect(() => {
        load();
        const timer = window.setInterval(load, 5 * 60 * 1000);
        router.events.on("routeChangeComplete", load);
        return () => {
            window.clearInterval(timer);
            router.events.off("routeChangeComplete", load);
        };
    }, [load, router.events]);

    const urgent = items.filter((i) => i.severity === "danger" || i.severity === "warning").length;

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    aria-label={items.length ? `Notificaciones: ${items.length}` : "Notificaciones"}
                    className="relative inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                    {urgent > 0 ? <BellRing className="size-[18px] animate-wiggle" /> : <Bell className="size-[18px]" />}
                    {items.length > 0 && (
                        <span
                            className={cn(
                                "absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-[18px] text-white animate-pop",
                                urgent > 0 ? "bg-destructive" : "bg-info"
                            )}
                        >
                            {items.length > 9 ? "9+" : items.length}
                        </span>
                    )}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="end"
                    sideOffset={8}
                    className="z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <p className="font-semibold">Notificaciones</p>
                        <Link href="/user/profile?tab=notificaciones" onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
                            Configurar
                        </Link>
                    </div>
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                            <CheckCircle2 className="size-8 text-success animate-pop" />
                            <p className="text-sm font-medium">Todo al día</p>
                            <p className="text-xs text-muted-foreground">No tienes pagos próximos ni alertas pendientes.</p>
                        </div>
                    ) : (
                        <ul className="max-h-[22rem] divide-y overflow-y-auto">
                            {items.map((item) => {
                                const Icon = ICONS[item.kind];
                                return (
                                    <li key={item.id}>
                                        <Link href={item.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition hover:bg-muted/60">
                                            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONES[item.severity])}>
                                                <Icon className="size-4" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-medium">{item.title}</span>
                                                <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
