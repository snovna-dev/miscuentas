import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { UserPlus } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/buttons";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { api, errorMessage } from "@/lib/client/api";
import { withPageAuth } from "@/lib/ssr";

export const getServerSideProps = withPageAuth("guest");

export default function SignUp() {
    const router = useRouter();
    const [form, setForm] = React.useState({ name: "", email: "", password: "", passwordConfirm: "" });
    const [errors, setErrors] = React.useState<Partial<Record<keyof typeof form, string>>>({});
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
        if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
    };

    function validate() {
        const next: typeof errors = {};
        if (form.name.trim().length < 2) next.name = "Escribe tu nombre.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Ingresa un correo válido.";
        if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
            next.password = "Usa al menos 8 caracteres combinando letras y números.";
        }
        if (form.password !== form.passwordConfirm) next.passwordConfirm = "Las contraseñas no coinciden.";
        return next;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        const next = validate();
        setErrors(next);
        if (Object.keys(next).length) return;

        setLoading(true);
        try {
            const data = await api<{ redirectTo: string }>("/api/signup", {
                method: "POST",
                body: { ...form, name: form.name.trim(), email: form.email.trim() },
            });
            // El servidor ya inició la sesión: vamos directo al onboarding.
            await router.push(data.redirectTo);
        } catch (err) {
            setError(errorMessage(err, "No fue posible crear la cuenta."));
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Crear cuenta"
            heading="Crea tu cuenta"
            subheading="En menos de 2 minutos tendrás tu presupuesto mensual organizado."
            footer={
                <>
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/auth/logIn" className="font-medium text-primary hover:underline">
                        Inicia sesión
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Field label="Nombre" htmlFor="name" error={errors.name}>
                    <Input id="name" autoComplete="name" autoFocus value={form.name} onChange={set("name")} placeholder="¿Cómo te llamas?" maxLength={80} disabled={loading} aria-invalid={Boolean(errors.name) || undefined} />
                </Field>

                <Field label="Correo electrónico" htmlFor="email" error={errors.email}>
                    <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="tu@correo.com" disabled={loading} aria-invalid={Boolean(errors.email) || undefined} />
                </Field>

                <Field label="Contraseña" htmlFor="password" error={errors.password}>
                    <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set("password")} placeholder="Mínimo 8 caracteres" disabled={loading} aria-invalid={Boolean(errors.password) || undefined} />
                    <PasswordStrength value={form.password} />
                </Field>

                <Field label="Confirmar contraseña" htmlFor="passwordConfirm" error={errors.passwordConfirm}>
                    <PasswordInput
                        id="passwordConfirm"
                        autoComplete="new-password"
                        value={form.passwordConfirm}
                        onChange={set("passwordConfirm")}
                        placeholder="Repite tu contraseña"
                        disabled={loading}
                        aria-invalid={Boolean(errors.passwordConfirm) || undefined}
                    />
                </Field>

                <FormError message={error} />

                <Button type="submit" size="lg" block loading={loading} loadingText="Creando tu cuenta…">
                    <UserPlus /> Crear cuenta
                </Button>

                <p className="text-center text-xs text-muted-foreground">Tus contraseñas se guardan cifradas. Nunca te pediremos claves bancarias.</p>
            </form>
        </AuthLayout>
    );
}
