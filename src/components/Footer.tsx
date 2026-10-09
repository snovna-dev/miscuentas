import { APP_VERSION } from "@/lib/version";

export function Footer() {
    return (
        <footer className="border-t py-4 text-center text-sm text-muted-foreground">
            <a href="https://snovna.online/"> © TODOS LOS DERECHOS RESERVADOS - Snovna</a>
            <p>MizCuentas · Versión {APP_VERSION}</p>
        </footer>
    );
}