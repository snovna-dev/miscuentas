import * as React from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { Dialog as DialogPrimitive, DropdownMenu } from "radix-ui";
import {
    BarChart3,
    Gauge,
    Landmark,
    LayoutDashboard,
    LogOut,
    MailWarning,
    MoreHorizontal,
    PiggyBank,
    Repeat,
    ShieldCheck,
    UserRound,
    Wallet,
    X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/contexts/UserContext";
import { api, errorMessage } from "@/lib/client/api";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    {
        title: "General",
        items: [
            { href: "/user/dashboard", label: "Resumen", icon: LayoutDashboard },
            { href: "/user/reports", label: "Reportes", icon: BarChart3 },
        ],
    },
    {
        title: "Mi dinero",
        items: [
            { href: "/user/incomes", label: "Ingresos", icon: Wallet },
            { href: "/user/expenses", label: "Gastos fijos", icon: Repeat },
            { href: "/user/budgets", label: "Presupuestos", icon: Gauge },
            { href: "/user/savings", label: "Ahorro", icon: PiggyBank },
            { href: "/user/accounts", label: "Cuentas", icon: Landmark },
        ],
    },
];

const ADMIN_ITEM: NavItem = { href: "/admin/dashboard", label: "Administración", icon: ShieldCheck };

// En celular: 4 accesos directos + "Más".
const MOBILE_TABS = ["/user/dashboard", "/user/incomes", "/user/expenses", "/user/savings"];

type AppShellProps = {
    title?: string;
    children: React.ReactNode;
    /** Oculta la navegación (p. ej. durante el onboarding). */
    minimal?: boolean;
    className?: string;
};

function VerifyBanner() {
    const toast = useToast();
    const [sending, setSending] = React.useState(false);
    const [hidden, setHidden] = React.useState(false);
    if (hidden) return null;

    async function resend() {
        setSending(true);
        try {
            await api("/api/auth/verify-email", { method: "POST", body: { resend: true } });
            toast.success("Te enviamos un nuevo enlace", "Revisa tu bandeja de entrada (y la carpeta de spam).");
        } catch (error) {
            toast.error("No se pudo reenviar", errorMessage(error));
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-info/30 bg-info/8 px-4 py-3 text-sm sm:flex-row sm:items-center animate-fade-in">
            <MailWarning className="size-4 shrink-0 text-info" />
            <p className="flex-1">
                <strong className="font-semibold">Confirma tu correo</strong> para recibir recordatorios de pago y poder recuperar tu cuenta.
            </p>
            <div className="flex gap-2">
                <button type="button" onClick={resend} disabled={sending} className="rounded-lg px-3 py-1.5 font-medium text-info transition hover:bg-info/10 disabled:opacity-60">
                    {sending ? "Enviando…" : "Reenviar correo"}
                </button>
                <button type="button" onClick={() => setHidden(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Ocultar aviso">
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}

function UserMenu({ compact = false }: { compact?: boolean }) {
    const { user, logout } = useUser();
    if (!user) return null;
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    className={cn("flex items-center gap-2.5 rounded-xl p-1 text-left transition hover:bg-muted", compact ? "pr-2" : "w-full p-2")}
                    aria-label="Menú de usuario"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-xs font-semibold text-white">{initials(user.name)}</span>
                    {compact ? (
                        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:block">{user.name.split(" ")[0]}</span>
                    ) : (
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{user.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                        </span>
                    )}
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align={compact ? "end" : "start"}
                    side={compact ? "bottom" : "top"}
                    sideOffset={8}
                    className="z-50 min-w-56 rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                    <DropdownMenu.Item asChild>
                        <Link href="/user/profile" className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted">
                            <UserRound className="size-4" /> Mi perfil y seguridad
                        </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item
                        onSelect={() => logout()}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10"
                    >
                        <LogOut className="size-4" /> Cerrar sesión
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

export function AppShell({ title, children, minimal = false, className }: AppShellProps) {
    const router = useRouter();
    const { user } = useUser();
    const [moreOpen, setMoreOpen] = React.useState(false);

    const groups = user?.isAdmin ? [...NAV_GROUPS, { title: "Administración", items: [ADMIN_ITEM] }] : NAV_GROUPS;
    const allItems = groups.flatMap((g) => g.items);
    const isActive = (href: string) => router.pathname === href || (href.startsWith("/admin") && router.pathname.startsWith("/admin"));
    const mobileTabs = allItems.filter((item) => MOBILE_TABS.includes(item.href));
    const moreItems = [...allItems.filter((item) => !MOBILE_TABS.includes(item.href)), { href: "/user/profile", label: "Perfil", icon: UserRound }];
    const moreActive = moreItems.some((item) => isActive(item.href));

    return (
        <div className="min-h-dvh lg:flex">
            {title && (
                <Head>
                    <title>{`${title} · MizCuentas`}</title>
                </Head>
            )}

            <a href="#contenido" className="sr-only z-[90] rounded-lg bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
                Saltar al contenido
            </a>

            {/* Barra lateral (escritorio) */}
            {!minimal && (
                <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/70 bg-card/60 backdrop-blur-xl lg:flex">
                    <div className="flex h-16 items-center px-5">
                        <Logo href="/user/dashboard" />
                    </div>
                    <nav aria-label="Principal" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
                        {groups.map((group) => (
                            <div key={group.title}>
                                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{group.title}</p>
                                <ul className="space-y-0.5">
                                    {group.items.map(({ href, label, icon: Icon }) => {
                                        const active = isActive(href);
                                        return (
                                            <li key={href}>
                                                <Link
                                                    href={href}
                                                    aria-current={active ? "page" : undefined}
                                                    className={cn(
                                                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    )}
                                                >
                                                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary animate-scale-in" />}
                                                    <Icon className="size-[18px] transition-transform group-hover:scale-110" />
                                                    {label}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>
                    <div className="border-t p-3">
                        <UserMenu />
                    </div>
                </aside>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
                    <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-3 sm:px-6">
                        <span className={cn(!minimal && "lg:hidden")}>
                            <Logo href={minimal ? null : "/user/dashboard"} textClassName="hidden min-[400px]:inline" />
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                            {!minimal && user && <NotificationBell />}
                            <ThemeToggle />
                            <span className={cn(!minimal && "lg:hidden")}>
                                <UserMenu compact />
                            </span>
                        </div>
                    </div>
                </header>

                <main id="contenido" className={cn("mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12", className)}>
                    {!minimal && user && !user.emailVerified && !user.isAdmin && <VerifyBanner />}
                    {children}
                </main>

                <footer className="hidden border-t py-5 text-center text-xs text-muted-foreground lg:block">
                    MizCuentas · v{process.env.NEXT_PUBLIC_APP_VERSION} ·{" "}
                    <a href="https://snovna.online/" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                        Snovna
                    </a>
                </footer>
            </div>

            {/* Barra inferior (celular) */}
            {!minimal && (
                <nav aria-label="Navegación móvil" className="fixed inset-x-3 bottom-3 z-40 flex items-center rounded-2xl border bg-popover/90 p-1.5 shadow-lift backdrop-blur-xl lg:hidden">
                    {mobileTabs.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={isActive(href) ? "page" : undefined}
                            className={cn(
                                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors",
                                isActive(href) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="size-5" />
                            <span className="truncate">{label}</span>
                        </Link>
                    ))}
                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        className={cn(
                            "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors",
                            moreActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        )}
                    >
                        <MoreHorizontal className="size-5" />
                        Más
                    </button>
                </nav>
            )}

            <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
                    <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border bg-popover p-5 pb-8 shadow-lift data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 lg:hidden">
                        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" aria-hidden="true" />
                        <DialogPrimitive.Title className="mb-3 text-sm font-semibold text-muted-foreground">Más opciones</DialogPrimitive.Title>
                        <DialogPrimitive.Description className="sr-only">Accesos a las demás secciones</DialogPrimitive.Description>
                        <div className="grid grid-cols-3 gap-2">
                            {moreItems.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setMoreOpen(false)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-medium transition",
                                        isActive(href) ? "border-primary/40 bg-primary/8 text-primary" : "hover:bg-muted"
                                    )}
                                >
                                    <Icon className="size-5" />
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
        </div>
    );
}
