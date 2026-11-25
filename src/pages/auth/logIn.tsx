import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, LogIn as LogInIcon, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useUser } from "@/contexts/UserContext";
import { api, errorMessage } from "@/lib/client/api";
import { withPageAuth } from "@/lib/ssr";
import type { SessionUser } from "@/types";

export const getServerSideProps = withPageAuth("guest");

function safeNext(value: unknown) {
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

type LoginResponse = { user?: SessionUser; redirectTo?: string; twoFactor?: boolean; challenge?: string };

export default function LogIn() {
    const router = useRouter();
    const { setUser } = useUser();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [challenge, setChallenge] = React.useState<string | null>(null);
    const [code, setCode] = React.useState("");
    const [useRecovery, setUseRecovery] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const expired = router.query.expired === "1";

    async function finish(data: LoginResponse) {
        setUser(data.user!);
        const next = safeNext(router.query.next);
        await router.push(next && !data.user!.needsOnboarding ? next : data.redirectTo!);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await api<LoginResponse>("/api/login", { method: "POST", body: { email: email.trim(), password } });
            if (data.twoFactor && data.challenge) {
                setChallenge(data.challenge);
                setPassword("");
                setLoading(false);
                return;
            }
            await finish(data);
        } catch (err) {
            setError(errorMessage(err, "No fue posible iniciar sesión."));
            setPassword("");
            setLoading(false);
        }
    }

    async function handleCode(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await finish(await api<LoginResponse>("/api/login/2fa", { method: "POST", body: { challenge, code } }));
        } catch (err) {
            setError(errorMessage(err, "El código no es válido."));
            setCode("");
            setLoading(false);
            if ((err as { status?: number }).status === 401 && /expir/i.test(errorMessage(err))) setChallenge(null);
        }
    }

    if (challenge) {
        return (
            <AuthLayout title="Verificación en dos pasos" heading="Verificación en dos pasos" subheading={useRecovery ? "Escribe uno de tus códigos de recuperación." : "Abre tu app autenticadora y escribe el código de 6 dígitos."}>
                <form onSubmit={handleCode} className="space-y-4">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-pop">
                        <ShieldCheck className="size-7" />
                    </div>
                    <Field label={useRecovery ? "Código de recuperación" : "Código de verificación"} htmlFor="code">
                        <Input
                            id="code"
                            autoFocus
                            autoComplete="one-time-code"
                            inputMode={useRecovery ? "text" : "numeric"}
                            maxLength={useRecovery ? 9 : 6}
                            value={code}
                            onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
                            placeholder={useRecovery ? "XXXX-XXXX" : "123456"}
                            className="text-center font-mono text-xl tracking-[0.35em]"
                        />
                    </Field>
                    <FormError message={error} />
                    <Button type="submit" size="lg" block loading={loading} loadingText="Verificando…" disabled={useRecovery ? code.length < 8 : code.length !== 6}>
                        Verificar e ingresar
                    </Button>
                    <div className="flex items-center justify-between text-sm">
                        <button type="button" onClick={() => setChallenge(null)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="size-4" /> Volver
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setUseRecovery((v) => !v);
                                setCode("");
                                setError(null);
                            }}
                            className="font-medium text-primary hover:underline"
                        >
                            {useRecovery ? "Usar código de la app" : "Usar código de recuperación"}
                        </button>
                    </div>
                </form>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Iniciar sesión"
            heading="Bienvenido de nuevo"
            subheading="Ingresa para revisar cómo van tus finanzas este mes."
            footer={
                <>
                    ¿Aún no tienes cuenta?{" "}
                    <Link href="/auth/signUp" className="font-medium text-primary hover:underline">
                        Créala gratis
                    </Link>
                </>
            }
        >
            {expired && !error && (
                <div className="mb-5 rounded-xl border border-info/30 bg-info/8 px-3.5 py-3 text-sm animate-scale-in">Tu sesión expiró. Ingresa de nuevo para continuar.</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Correo electrónico" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" disabled={loading} />
                </Field>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-foreground/90">
                            Contraseña
                        </label>
                        <Link href="/auth/forgot" className="text-xs font-medium text-primary hover:underline">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                    <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña" disabled={loading} />
                </div>

                <FormError message={error} />

                <Button type="submit" size="lg" block loading={loading} loadingText="Ingresando…">
                    <LogInIcon /> Ingresar
                </Button>
            </form>
        </AuthLayout>
    );
}
