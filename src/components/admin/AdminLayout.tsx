import Link from "next/link";
import { useRouter } from "next/router";
import { CalendarRange, FolderTree, Landmark, LayoutGrid, ListChecks, Receipt, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const ADMIN_SECTIONS = [
    { href: "/admin/dashboard", label: "Inicio", icon: LayoutGrid, description: "Resumen del panel" },
    { href: "/admin/users", label: "Usuarios", icon: Users, description: "Cuentas registradas" },
    { href: "/admin/categories", label: "Categorías", icon: FolderTree, description: "Tipos de gasto globales" },
    { href: "/admin/periods", label: "Períodos", icon: CalendarRange, description: "Años, meses y semanas" },
    { href: "/admin/incomes", label: "Ingresos", icon: Wallet, description: "Ingresos de todos los usuarios" },
    { href: "/admin/expenses", label: "Gastos", icon: Receipt, description: "Definiciones de gastos" },
    { href: "/admin/expensesPeriods", label: "Gastos por mes", icon: ListChecks, description: "Registros mensuales por usuario" },
    { href: "/admin/bankAccounts", label: "Cuentas", icon: Landmark, description: "Cuentas bancarias" },
];

export function AdminLayout({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
    const router = useRouter();
    return (
        <AppShell title={`Admin · ${title}`}>
            <nav aria-label="Secciones de administración" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <div className="inline-flex gap-1 rounded-2xl border bg-card p-1 shadow-soft">
                    {ADMIN_SECTIONS.map(({ href, label, icon: Icon }) => {
                        const active = router.pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
                                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="size-4" />
                                {label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
            <PageHeader eyebrow="Administración" title={title} description={description} actions={actions} />
            <div className="mt-6 space-y-6">{children}</div>
        </AppShell>
    );
}
