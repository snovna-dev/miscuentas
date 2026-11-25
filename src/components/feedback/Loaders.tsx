import * as React from "react";
import { useRouter } from "next/router";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/** Pantalla de carga de marca (solo para cargas completas, no bloquea formularios). */
export function PageLoader({ label = "Cargando tus finanzas…", className }: { label?: string; className?: string }) {
    return (
        <div role="status" aria-live="polite" className={cn("flex min-h-[50vh] flex-col items-center justify-center gap-5 animate-fade-in", className)}>
            <div className="relative">
                <span className="absolute inset-0 -m-3 animate-ping rounded-[22px] bg-primary/15" />
                <span className="absolute inset-0 -m-1.5 rounded-[20px] bg-primary/10" />
                <LogoMark size={64} animated className="relative drop-shadow-lg" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
    );
}

/** Overlay de carga a pantalla completa (por ejemplo al cerrar el onboarding). */
export function FullscreenLoader({ label }: { label?: string }) {
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <PageLoader label={label} className="min-h-0" />
        </div>
    );
}

/** Compatibilidad con el componente anterior. */
export default function Loader() {
    return <FullscreenLoader />;
}

/** Barra superior de progreso al cambiar de página. */
export function RouteProgress() {
    const router = useRouter();
    const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");

    React.useEffect(() => {
        let timer: number | undefined;
        const start = (url: string) => {
            if (url === router.asPath) return;
            window.clearTimeout(timer);
            // Solo aparece si la navegación tarda (evita parpadeos en cambios instantáneos).
            timer = window.setTimeout(() => setState("loading"), 120);
        };
        const end = () => {
            window.clearTimeout(timer);
            setState((current) => (current === "loading" ? "done" : "idle"));
            timer = window.setTimeout(() => setState("idle"), 450);
        };

        router.events.on("routeChangeStart", start);
        router.events.on("routeChangeComplete", end);
        router.events.on("routeChangeError", end);
        return () => {
            window.clearTimeout(timer);
            router.events.off("routeChangeStart", start);
            router.events.off("routeChangeComplete", end);
            router.events.off("routeChangeError", end);
        };
    }, [router]);

    if (state === "idle") return null;

    return (
        <div
            aria-hidden="true"
            className="route-progress"
            style={{
                transform: state === "loading" ? "scaleX(0.75)" : "scaleX(1)",
                opacity: state === "done" ? 0 : 1,
                transition: state === "loading" ? "transform 8s cubic-bezier(0.1, 0.7, 0.2, 1)" : "transform 0.25s ease, opacity 0.4s ease 0.15s",
            }}
        />
    );
}
