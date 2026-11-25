import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/client/api";
import { withPageAuth } from "@/lib/ssr";

export const getServerSideProps = withPageAuth("guest");

export default function Forgot() {
    const [email, setEmail] = React.useState("");
    const [sent, setSent] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await api("/api/auth/forgot", { method: "POST", body: { email: email.trim() } });
            setSent(true);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Recuperar contraseña"
            heading={sent ? "Revisa tu correo" : "¿Olvidaste tu contraseña?"}
            subheading={sent ? "Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña." : "Escribe tu correo y te enviaremos un enlace para restablecerla."}
            footer={
                <Link href="/auth/logIn" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    <ArrowLeft className="size-4" /> Volver a iniciar sesión
                </Link>
            }
        >
            {sent ? (
                <div className="space-y-4 rounded-2xl border bg-card p-6 text-center shadow-soft animate-scale-in">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/12 text-success animate-pop">
                        <MailCheck className="size-7" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        El enlace vence en <strong className="text-foreground">30 minutos</strong>. Si no lo ves, revisa la carpeta de spam o promociones.
                    </p>
                    <Button variant="outline" onClick={() => setSent(false)}>
                        Usar otro correo
                    </Button>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Correo electrónico" htmlFor="email">
                        <Input id="email" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
                    </Field>
                    <FormError message={error} />
                    <Button type="submit" size="lg" block loading={loading} loadingText="Enviando…">
                        <Send /> Enviar enlace
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}
