import * as React from "react";
import Head from "next/head";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    BellRing,
    CalendarClock,
    Check,
    ChevronDown,
    Lock,
    Mail,
    Menu,
    Repeat,
    Smartphone,
    Wallet,
    X,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/buttons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { cn } from "@/lib/utils";

const NAV = [
    { href: "#funciones", label: "Funciones" },
    { href: "#como-funciona", label: "Cómo funciona" },
    { href: "#preguntas", label: "Preguntas" },
];

const FEATURES = [
    { icon: Repeat, title: "Gastos fijos automáticos", text: "Arriendo, servicios o créditos se registran solos cada mes. Solo marcas cuando pagas." },
    { icon: CalendarClock, title: "Planea pagos futuros", text: "¿Un gasto para diciembre? Regístralo hoy con su fecha y quedará en el mes correcto." },
    { icon: BarChart3, title: "Sabe en qué se va tu dinero", text: "Distribución por categoría para detectar fugas y ajustar tu presupuesto." },
    { icon: BellRing, title: "Nada se te pasa", text: "Pendientes de meses anteriores y vencimientos cercanos siempre visibles." },
    { icon: Wallet, title: "Disponible real", text: "Ingresos menos gastos del mes: la cifra que de verdad importa." },
    { icon: Smartphone, title: "Hecho para el celular", text: "Registra un gasto en segundos desde cualquier lugar, en modo claro u oscuro." },
];

const STEPS = [
    { title: "Crea tu cuenta", text: "Gratis y en menos de un minuto." },
    { title: "Configura tu mes", text: "Tu ingreso y tus gastos fijos en un onboarding guiado." },
    { title: "Registra y paga", text: "Anota gastos variables y marca tus pagos con un toque." },
];

const FAQS = [
    {
        q: "¿Qué pasa si registro un gasto con fecha futura?",
        a: "Queda registrado en el mes de esa fecha. Por ejemplo, un gasto del 15 de diciembre aparece en diciembre (y en la sección Próximos gastos), sin afectar el disponible del mes actual.",
    },
    {
        q: "¿Cómo funcionan los gastos fijos?",
        a: "Los configuras una vez con su valor y día de pago. Al comenzar cada mes, MizCuentas los registra como pendientes para que solo tengas que marcarlos como pagados.",
    },
    {
        q: "¿Necesito conectar mi banco?",
        a: "No. MizCuentas nunca te pide claves ni números completos de cuenta. Tú registras la información y mantienes el control.",
    },
    {
        q: "¿Mis datos están seguros?",
        a: "Las contraseñas se guardan cifradas, las sesiones viajan en cookies protegidas y cada usuario solo puede ver su propia información.",
    },
];

function useScrolled(offset = 12) {
    const [scrolled, setScrolled] = React.useState(false);
    React.useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > offset);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [offset]);
    return scrolled;
}

/** Aparece al entrar en pantalla (IntersectionObserver). */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    return (
        <div
            ref={ref}
            className={cn("transition-all duration-700 ease-out", visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

function HeroMock() {
    const rows = [
        { name: "Arriendo", cat: "Vivienda", amount: "$ 1.200.000", paid: true },
        { name: "Internet hogar", cat: "Servicios publicos", amount: "$ 95.000", paid: true },
        { name: "Mercado quincenal", cat: "Mercado", amount: "$ 380.000", paid: false },
        { name: "Cine con amigos", cat: "Entretenimiento", amount: "$ 64.000", paid: false },
    ];
    return (
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand-gradient opacity-25 blur-3xl" aria-hidden="true" />
            <div className="rounded-3xl border bg-card p-5 shadow-lift animate-scale-in">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">Noviembre</p>
                        <p className="text-lg font-semibold">Tu mes en un vistazo</p>
                    </div>
                    <LogoMark size={32} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-success/10 p-3">
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="font-semibold tabular text-success">$ 3.500.000</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3">
                        <p className="text-xs text-muted-foreground">Disponible</p>
                        <p className="font-semibold tabular text-primary">$ 1.761.000</p>
                    </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[68%] rounded-full bg-brand-gradient animate-[fade-in_1s_ease-out]" />
                </div>
                <ul className="mt-4 divide-y">
                    {rows.map((row) => (
                        <li key={row.name} className="flex items-center gap-3 py-2.5">
                            <CategoryIcon name={row.cat} size="sm" />
                            <div className="min-w-0 flex-1">
                                <p className={cn("truncate text-sm font-medium", row.paid && "text-muted-foreground line-through")}>{row.name}</p>
                                <p className="text-[11px] text-muted-foreground">{row.cat}</p>
                            </div>
                            <p className="text-sm font-semibold tabular">{row.amount}</p>
                            <span
                                className={cn(
                                    "flex size-6 items-center justify-center rounded-full border-2",
                                    row.paid ? "border-success bg-success text-white" : "border-border"
                                )}
                            >
                                {row.paid && <Check className="size-3.5" />}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border bg-card px-4 py-3 shadow-lift sm:block animate-float" style={{ animationDelay: "1.2s" }}>
                <p className="flex items-center gap-2 text-sm font-medium">
                    <CalendarClock className="size-4 text-info" /> Programado para diciembre
                </p>
                <p className="text-xs text-muted-foreground">Regalos de navidad · $ 450.000</p>
            </div>
        </div>
    );
}

export function Landing() {
    const scrolled = useScrolled();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [openFaq, setOpenFaq] = React.useState<number | null>(0);

    return (
        <div className="min-h-dvh overflow-x-hidden">
            <Head>
                <title>MizCuentas · Tu dinero, bajo control</title>
            </Head>

            {/* Navegación */}
            <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "border-b bg-background/80 backdrop-blur-xl" : "bg-transparent")}>
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
                    <Logo />
                    <nav className="ml-6 hidden gap-1 md:flex" aria-label="Secciones">
                        {NAV.map((item) => (
                            <a key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
                                {item.label}
                            </a>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                        <Button variant="ghost" href="/auth/logIn" className="hidden sm:inline-flex">
                            Iniciar sesión
                        </Button>
                        <Button href="/auth/signUp" className="hidden sm:inline-flex">
                            Crear cuenta
                        </Button>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((v) => !v)}
                            className="flex size-10 items-center justify-center rounded-xl hover:bg-muted md:hidden"
                            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
                {menuOpen && (
                    <div className="border-t bg-background/95 px-4 pb-5 pt-3 backdrop-blur-xl md:hidden animate-fade-in">
                        <nav className="flex flex-col gap-1">
                            {NAV.map((item) => (
                                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 font-medium hover:bg-muted">
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button variant="outline" href="/auth/logIn">
                                Iniciar sesión
                            </Button>
                            <Button href="/auth/signUp">Crear cuenta</Button>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero */}
            <section className="relative pt-28 sm:pt-36">
                <div className="absolute inset-x-0 top-0 -z-10 h-[680px] bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
                <div className="absolute left-1/2 top-24 -z-10 size-[560px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" aria-hidden="true" />

                <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 sm:px-6 lg:grid-cols-2">
                    <div className="space-y-7 text-center lg:text-left">
                        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft animate-fade-up">
                            <span className="size-1.5 rounded-full bg-success" /> Finanzas personales en pesos colombianos
                        </span>
                        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl animate-fade-up" style={{ animationDelay: "60ms" }}>
                            Tu dinero, <span className="text-brand-gradient">bajo control</span> mes a mes.
                        </h1>
                        <p className="mx-auto max-w-xl text-lg text-muted-foreground lg:mx-0 animate-fade-up" style={{ animationDelay: "120ms" }}>
                            Registra ingresos, automatiza tus gastos fijos y programa pagos futuros. MizCuentas te muestra cuánto tienes disponible de verdad.
                        </p>
                        <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start animate-fade-up" style={{ animationDelay: "180ms" }}>
                            <Button size="xl" href="/auth/signUp">
                                Empieza gratis <ArrowRight />
                            </Button>
                            <Button size="xl" variant="outline" href="/auth/logIn">
                                Ya tengo cuenta
                            </Button>
                        </div>
                        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start animate-fade-in" style={{ animationDelay: "300ms" }}>
                            {["Sin tarjeta de crédito", "Sin conectar tu banco", "Listo en 2 minutos"].map((item) => (
                                <li key={item} className="flex items-center gap-1.5">
                                    <Check className="size-4 text-success" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <HeroMock />
                </div>
            </section>

            {/* Funciones */}
            <section id="funciones" className="scroll-mt-20 border-y bg-card/60 py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <Reveal className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-semibold text-primary">Funciones</p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Todo lo que necesitas, nada que te complique</h2>
                        <p className="mt-3 text-muted-foreground">Diseñado para que llevar tus cuentas tome minutos, no horas.</p>
                    </Reveal>
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, text }, index) => (
                            <Reveal key={title} delay={index * 70}>
                                <article className="group h-full rounded-3xl border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                                        <Icon className="size-6" />
                                    </span>
                                    <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                                </article>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Cómo funciona */}
            <section id="como-funciona" className="scroll-mt-20 py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <Reveal className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-semibold text-primary">Cómo funciona</p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tres pasos para ordenar tu mes</h2>
                    </Reveal>
                    <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
                        <div className="absolute left-[16%] right-[16%] top-7 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" aria-hidden="true" />
                        {STEPS.map((step, index) => (
                            <Reveal key={step.title} delay={index * 120}>
                                <li className="relative text-center">
                                    <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-semibold text-white shadow-lift">
                                        {index + 1}
                                    </span>
                                    <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                                </li>
                            </Reveal>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Seguridad */}
            <section className="py-6">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <Reveal>
                        <div className="relative overflow-hidden rounded-[2rem] bg-brand-gradient px-6 py-12 text-white sm:px-12">
                            <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
                            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
                                <div className="space-y-3">
                                    <p className="flex items-center gap-2 text-sm font-medium text-white/85">
                                        <Lock className="size-4" /> Privacidad primero
                                    </p>
                                    <h2 className="text-3xl font-semibold tracking-tight">Tus finanzas son solo tuyas</h2>
                                    <p className="max-w-xl text-white/85">
                                        Contraseñas cifradas, sesiones seguras y sin acceso a tus cuentas bancarias. Cada usuario ve únicamente su información.
                                    </p>
                                </div>
                                <Button size="xl" href="/auth/signUp" className="bg-white text-[#0f5e57] shadow-xl hover:bg-white/90">
                                    Crear mi cuenta <ArrowRight />
                                </Button>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* FAQ */}
            <section id="preguntas" className="scroll-mt-20 py-20">
                <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
                    <Reveal>
                        <p className="text-sm font-semibold text-primary">Preguntas frecuentes</p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight">¿Tienes dudas?</h2>
                        <p className="mt-3 text-muted-foreground">Si no encuentras tu respuesta, escríbenos y te ayudamos.</p>
                        <a href="mailto:mikecode.contact@gmail.com" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                            <Mail className="size-4" /> mikecode.contact@gmail.com
                        </a>
                    </Reveal>
                    <div className="space-y-3">
                        {FAQS.map((faq, index) => {
                            const open = openFaq === index;
                            return (
                                <Reveal key={faq.q} delay={index * 60}>
                                    <div className={cn("overflow-hidden rounded-2xl border bg-card transition-shadow", open && "shadow-soft")}>
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(open ? null : index)}
                                            aria-expanded={open}
                                            className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium"
                                        >
                                            {faq.q}
                                            <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180 text-primary")} />
                                        </button>
                                        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                                            <div className="overflow-hidden">
                                                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                                            </div>
                                        </div>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            <footer className="border-t py-10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
                    <Logo />
                    <p>
                        © {new Date().getFullYear()} MizCuentas · v{process.env.NEXT_PUBLIC_APP_VERSION} ·{" "}
                        <a href="https://snovna.online/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                            Snovna
                        </a>
                    </p>
                    <div className="flex gap-4">
                        <Link href="/auth/logIn" className="hover:text-foreground">
                            Iniciar sesión
                        </Link>
                        <Link href="/auth/signUp" className="hover:text-foreground">
                            Registrarse
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
