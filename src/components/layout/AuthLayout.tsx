import * as React from "react";
import Head from "next/head";
import { CalendarClock, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Props = {
    title: string;
    heading: string;
    subheading: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

const HIGHLIGHTS = [
    { icon: TrendingUp, text: "Conoce tu dinero disponible cada mes" },
    { icon: CalendarClock, text: "Programa gastos futuros en el mes correcto" },
    { icon: CheckCircle2, text: "Tus gastos fijos se registran solos" },
    { icon: ShieldCheck, text: "Sesión protegida y datos privados" },
];

export function AuthLayout({ title, heading, subheading, children, footer }: Props) {
    return (
        <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
            <Head>
                <title>{`${title} · MizCuentas`}</title>
            </Head>

            {/* Panel de marca */}
            <aside className="relative hidden overflow-hidden bg-brand-gradient p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="absolute inset-0 bg-grid opacity-25" aria-hidden="true" />
                <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />

                <Logo href="/" textClassName="text-white [&_span]:text-white/80" />

                <div className="relative space-y-8">
                    <div className="relative mx-auto w-full max-w-sm">
                        <div className="rounded-3xl border border-white/20 bg-white/12 p-5 shadow-2xl backdrop-blur-md animate-float">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-white/80">Disponible este mes</p>
                                <LogoMark size={28} />
                            </div>
                            <p className="mt-2 text-3xl font-semibold tabular">$ 1.840.000</p>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                                <div className="h-full w-2/3 rounded-full bg-white" />
                            </div>
                            <p className="mt-2 text-xs text-white/75">68% de tus gastos ya están pagados</p>
                        </div>
                        <div
                            className="absolute -bottom-8 -right-6 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-sm shadow-xl backdrop-blur-md animate-float"
                            style={{ animationDelay: "1.5s" }}
                        >
                            <p className="flex items-center gap-2 font-medium">
                                <CalendarClock className="size-4" /> Programado: Diciembre
                            </p>
                            <p className="text-xs text-white/75">Viaje de fin de año · $ 450.000</p>
                        </div>
                    </div>

                    <ul className="space-y-3 pt-6 stagger">
                        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-white/90">
                                <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
                                    <Icon className="size-4" />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-white/70">© {new Date().getFullYear()} MizCuentas · Snovna</p>
            </aside>

            {/* Formulario */}
            <main className="flex flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <span className="lg:hidden">
                        <Logo />
                    </span>
                    <span className="hidden lg:block" />
                    <ThemeToggle />
                </div>

                <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
                    <div className="mb-8 space-y-2 animate-fade-up">
                        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
                        <p className="text-muted-foreground">{subheading}</p>
                    </div>
                    <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
                        {children}
                    </div>
                    {footer && <div className="mt-8 text-center text-sm text-muted-foreground animate-fade-in">{footer}</div>}
                </div>
            </main>
        </div>
    );
}
