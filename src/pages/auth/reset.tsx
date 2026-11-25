import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { PageLoader } from "@/components/feedback/Loaders";
import { api, errorMessage } from "@/lib/client/api";
import { withPageAuth } from "@/lib/ssr";

export const getServerSideProps = withPageAuth("guest");

export default function Reset() {
    const router = useRouter();
    const token = typeof router.query.token === "string" ? router.query.token : "";
    const [status, setStatus] = React.useState<"checking" | "valid" | "invalid" | "done">("checking");
    const [password, setPassword] = React.useState("");
    const [confirm, setConfirm] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!router.isReady) return;
        if (!token) {
            setStatus("invalid");
            return;
        }
        api<{ valid: boolean }>(`/api/auth/reset?token=${encodeURIComponent(token)}`)
            .then((data) => setStatus(data.valid ? "valid" : "invalid"))
            .catch(() => setStatus("invalid"));
    }, [router.isReady, token]);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        if (password !== confirm) return setError("Las contraseñas no coinciden.");
        setLoading(true);
        try {
            await api("/api/auth/reset", { method: "POST", body: { token, password, passwordConfirm: confirm } });
            setStatus("done");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Nueva contraseña"
            heading={status === "done" ? "¡Contraseña actualizada!" : status === "invalid" ? "Enlace no válido" : "Crea una nueva contraseña"}
            subheading={
                status === "done"
                    ? "Por seguridad cerramos todas tus sesiones. Ingresa con tu nueva contraseña."
                    : status === "invalid"
                      ? "El enlace ya se usó o venció (dura 30 minutos). Solicita uno nuevo."
                      : "Usa al menos 8 caracteres combinando letras y números."
            }
        >
            {status === "checking" && <PageLoader label="Verificando enlace…" className="min-h-40" />}

            {status === "invalid" && (
                <div className="space-y-4 text-center animate-scale-in">
                    <XCircle className="mx-auto size-12 text-destructive animate-pop" />
                    <Button href="/auth/forgot" block>
                        Solicitar un nuevo enlace
                    </Button>
                </div>
            )}

            {status === "done" && (
                <div className="space-y-4 text-center animate-scale-in">
                    <CheckCircle2 className="mx-auto size-12 text-success animate-pop" />
                    <Button href="/auth/logIn" block size="lg">
                        Iniciar sesión
                    </Button>
                </div>
            )}

            {status === "valid" && (
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Nueva contraseña" htmlFor="password">
                        <PasswordInput id="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
                        <PasswordStrength value={password} />
                    </Field>
                    <Field label="Confirmar contraseña" htmlFor="confirm">
                        <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    </Field>
                    <FormError message={error} />
                    <Button type="submit" size="lg" block loading={loading} loadingText="Guardando…">
                        <KeyRound /> Guardar contraseña
                    </Button>
                    <p className="text-center text-sm">
                        <Link href="/auth/logIn" className="text-muted-foreground hover:text-foreground">
                            Cancelar
                        </Link>
                    </p>
                </form>
            )}
        </AuthLayout>
    );
}
