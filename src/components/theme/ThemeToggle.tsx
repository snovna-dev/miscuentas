import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mc-theme";

/** Script que se ejecuta antes de pintar para evitar el parpadeo de tema. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

function subscribe(callback: () => void) {
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
    const dark = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    function toggle() {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        try {
            localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
        } catch {
            // almacenamiento no disponible (modo privado): el tema solo dura esta visita
        }
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
            title={dark ? "Modo claro" : "Modo oscuro"}
            className={cn(
                "relative inline-flex size-10 items-center justify-center overflow-hidden rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground",
                className
            )}
        >
            <Sun className={cn("absolute size-[18px] transition-all duration-500", dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} />
            <Moon className={cn("absolute size-[18px] transition-all duration-500", dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
        </button>
    );
}
