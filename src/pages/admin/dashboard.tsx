import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AdminLayout, ADMIN_SECTIONS } from "@/components/admin/AdminLayout";
import { withPageAuth } from "@/lib/ssr";

export const getServerSideProps = withPageAuth("admin");

export default function AdminDashboard() {
    return (
        <AdminLayout title="Panel de administración" description="Gestiona la configuración global y consulta la información de los usuarios.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
                {ADMIN_SECTIONS.slice(1).map(({ href, label, icon: Icon, description }) => (
                    <Link
                        key={href}
                        href={href}
                        className="group flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                    >
                        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                            <Icon className="size-5" />
                        </span>
                        <span className="flex-1">
                            <span className="block font-semibold">{label}</span>
                            <span className="block text-sm text-muted-foreground">{description}</span>
                        </span>
                        <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                ))}
            </div>
        </AdminLayout>
    );
}
