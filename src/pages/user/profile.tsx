import * as React from "react";
import { useRouter } from "next/router";
import { BadgeCheck, Bell, Copy, Download, KeyRound, LogOut, Mail, MailWarning, MonitorSmartphone, ShieldCheck, ShieldOff, Smartphone, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/buttons";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput, PasswordStrength } from "@/components/ui/password-input";
import { SelectField } from "@/components/ui/category-select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/contexts/UserContext";
import { api, errorMessage } from "@/lib/client/api";
import { withPageAuth } from "@/lib/ssr";
import type { Profile } from "@/types";

export const getServerSideProps = withPageAuth("user");

type Tab = "perfil" | "seguridad" | "notificaciones";

/* ---------------------------------- Perfil ---------------------------------- */

function ProfileTab({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
    const toast = useToast();
    const { user, setUser } = useUser();
    const [name, setName] = React.useState(profile.name);
    const [savingName, setSavingName] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [emailError, setEmailError] = React.useState<string | null>(null);
    const [savingEmail, setSavingEmail] = React.useState(false);
    const [resending, setResending] = React.useState(false);

    async function saveName(event: React.FormEvent) {
        event.preventDefault();
        setSavingName(true);
        try {
            const data = await api<{ profile: Profile }>("/api/profile", {
                method: "PUT",
                body: { name, notify_email: profile.notify_email, reminder_days: profile.reminder_days },
            });
            onChange(data.profile);
            if (user) setUser({ ...user, name: data.profile.name });
            toast.success("Perfil actualizado");
        } catch (error) {
            toast.error("No se pudo guardar", errorMessage(error));
        } finally {
            setSavingName(false);
        }
    }

    async function changeEmail(event: React.FormEvent) {
        event.preventDefault();
        setEmailError(null);
        setSavingEmail(true);
        try {
            const data = await api<{ profile: Profile }>("/api/profile", { method: "POST", body: { action: "email", email, password } });
            onChange(data.profile);
            if (user) setUser({ ...user, email: data.profile.email, emailVerified: false });
            setEmail("");
            setPassword("");
            toast.success("Correo actualizado", "Te enviamos un enlace para confirmarlo.");
        } catch (error) {
            setEmailError(errorMessage(error));
        } finally {
            setSavingEmail(false);
        }
    }

    async function resend() {
        setResending(true);
        try {
            await api("/api/auth/verify-email", { method: "POST", body: { resend: true } });
            toast.success("Enlace enviado", `Revisa ${profile.email}.`);
        } catch (error) {
            toast.error("No se pudo enviar", errorMessage(error));
        } finally {
            setResending(false);
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserRound className="size-4 text-primary" /> Datos personales
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={saveName} className="space-y-4">
                        <Field label="Nombre" htmlFor="pf-name">
                            <Input id="pf-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
                        </Field>
                        <Field label="Correo" htmlFor="pf-email-current">
                            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm">
                                <Mail className="size-4 text-muted-foreground" />
                                <span className="flex-1 truncate">{profile.email}</span>
                                {profile.email_verified ? (
                                    <Badge tone="success">
                                        <BadgeCheck className="size-3.5" /> Verificado
                                    </Badge>
                                ) : (
                                    <Badge tone="warning">
                                        <MailWarning className="size-3.5" /> Sin verificar
                                    </Badge>
                                )}
                            </div>
                        </Field>
                        {!profile.email_verified && (
                            <Button variant="link" size="sm" loading={resending} onClick={resend}>
                                Reenviar enlace de verificación
                            </Button>
                        )}
                        <div className="flex justify-end">
                            <Button type="submit" loading={savingName} disabled={name.trim() === profile.name || name.trim().length < 2}>
                                Guardar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="size-4 text-primary" /> Cambiar correo
                    </CardTitle>
                    <CardDescription>Confirmaremos el nuevo correo y avisaremos al anterior.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={changeEmail} className="space-y-4">
                        <Field label="Nuevo correo" htmlFor="pf-email">
                            <Input id="pf-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nuevo@correo.com" />
                        </Field>
                        <Field label="Tu contraseña actual" htmlFor="pf-email-pass">
                            <PasswordInput id="pf-email-pass" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </Field>
                        <FormError message={emailError} />
                        <div className="flex justify-end">
                            <Button type="submit" loading={savingEmail} disabled={!email || !password}>
                                Cambiar correo
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

/* -------------------------------- Seguridad --------------------------------- */

function TwoFactorCard({ profile, onChange }: { profile: Profile; onChange: () => Promise<void> }) {
    const toast = useToast();
    const [setup, setSetup] = React.useState<{ qr: string; secret: string } | null>(null);
    const [code, setCode] = React.useState("");
    const [codes, setCodes] = React.useState<string[] | null>(null);
    const [disabling, setDisabling] = React.useState(false);
    const [password, setPassword] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);

    async function start() {
        setBusy(true);
        setError(null);
        try {
            setSetup(await api<{ qr: string; secret: string }>("/api/profile/two-factor", { method: "POST" }));
        } catch (err) {
            toast.error("No se pudo iniciar", errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    async function confirm(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const data = await api<{ recoveryCodes: string[] }>("/api/profile/two-factor", { method: "PUT", body: { code } });
            setCodes(data.recoveryCodes);
            setSetup(null);
            setCode("");
            toast.success("Verificación en dos pasos activada");
            await onChange();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    async function disable(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await api("/api/profile/two-factor", { method: "DELETE", body: { password, code } });
            setDisabling(false);
            setPassword("");
            setCode("");
            toast.success("Verificación en dos pasos desactivada");
            await onChange();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    function downloadCodes() {
        if (!codes) return;
        const blob = new Blob([`Códigos de recuperación de MizCuentas\nCada código sirve una sola vez.\n\n${codes.join("\n")}\n`], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mizcuentas-codigos-recuperacion.txt";
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <Card className="lg:col-span-2">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Smartphone className="size-4 text-primary" /> Verificación en dos pasos
                    </CardTitle>
                    <CardDescription>Además de tu contraseña, pediremos un código de tu app autenticadora (Google Authenticator, Microsoft Authenticator, Authy…).</CardDescription>
                </div>
                {profile.two_factor_enabled ? (
                    <Badge tone="success">
                        <ShieldCheck className="size-3.5" /> Activa
                    </Badge>
                ) : (
                    <Badge>Desactivada</Badge>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {codes && (
                    <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 animate-scale-in">
                        <p className="text-sm font-semibold">Guarda tus códigos de recuperación</p>
                        <p className="text-xs text-muted-foreground">Te permiten entrar si pierdes el celular. Cada uno sirve una sola vez y no los volveremos a mostrar.</p>
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
                            {codes.map((c) => (
                                <span key={c} className="rounded-lg bg-card px-3 py-2 text-center tracking-wider">
                                    {c}
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigator.clipboard?.writeText(codes.join("\n")).then(() => toast.success("Códigos copiados"))}
                            >
                                <Copy /> Copiar
                            </Button>
                            <Button size="sm" variant="outline" onClick={downloadCodes}>
                                <Download /> Descargar .txt
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setCodes(null)}>
                                Ya los guardé
                            </Button>
                        </div>
                    </div>
                )}

                {!profile.two_factor_enabled && !setup && (
                    <Button onClick={start} loading={busy}>
                        <ShieldCheck /> Activar verificación
                    </Button>
                )}

                {setup && (
                    <form onSubmit={confirm} className="grid gap-6 rounded-2xl border p-4 sm:grid-cols-[auto_1fr] animate-fade-up">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={setup.qr} alt="Código QR para la app autenticadora" width={180} height={180} className="mx-auto rounded-xl border bg-white p-2" />
                        <div className="space-y-3">
                            <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                                <li>Abre tu app autenticadora y escanea el código QR.</li>
                                <li>
                                    ¿No puedes escanear? Ingresa esta clave: <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{setup.secret}</code>
                                </li>
                                <li>Escribe el código de 6 dígitos que aparece.</li>
                            </ol>
                            <Field label="Código de verificación" htmlFor="tf-code">
                                <Input
                                    id="tf-code"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="123456"
                                    className="max-w-40 text-center font-mono text-lg tracking-[0.4em]"
                                    autoFocus
                                />
                            </Field>
                            <FormError message={error} />
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" loading={busy} disabled={code.length !== 6}>
                                    Confirmar y activar
                                </Button>
                                <Button variant="ghost" onClick={() => setSetup(null)}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </form>
                )}

                {profile.two_factor_enabled && !disabling && (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        Te quedan {profile.recovery_codes_left} códigos de recuperación.
                        <Button variant="outline" size="sm" onClick={() => setDisabling(true)}>
                            <ShieldOff /> Desactivar
                        </Button>
                    </div>
                )}

                {disabling && (
                    <form onSubmit={disable} className="grid gap-4 rounded-2xl border border-destructive/25 p-4 sm:grid-cols-2 animate-fade-up">
                        <Field label="Contraseña" htmlFor="tf-pass">
                            <PasswordInput id="tf-pass" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </Field>
                        <Field label="Código de la app o de recuperación" htmlFor="tf-dcode">
                            <Input id="tf-dcode" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" placeholder="123456" />
                        </Field>
                        <div className="sm:col-span-2">
                            <FormError message={error} />
                        </div>
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <Button type="submit" variant="destructive" loading={busy} disabled={!password || !code}>
                                Desactivar
                            </Button>
                            <Button variant="ghost" onClick={() => setDisabling(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

function SecurityTab({ profile, reload }: { profile: Profile; reload: () => Promise<void> }) {
    const toast = useToast();
    const [form, setForm] = React.useState({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
    const [error, setError] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [closing, setClosing] = React.useState(false);

    async function changePassword(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        if (form.newPassword !== form.newPasswordConfirm) return setError("Las contraseñas no coinciden.");
        setSaving(true);
        try {
            await api("/api/profile", { method: "POST", body: { action: "password", ...form } });
            setForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
            toast.success("Contraseña actualizada", "Cerramos la sesión en tus otros dispositivos.");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function logoutOthers() {
        setClosing(true);
        try {
            await api("/api/profile", { method: "POST", body: { action: "logout-others" } });
            toast.success("Listo", "Cerramos la sesión en los demás dispositivos.");
        } catch (err) {
            toast.error("No se pudo cerrar", errorMessage(err));
        } finally {
            setClosing(false);
        }
    }

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound className="size-4 text-primary" /> Cambiar contraseña
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={changePassword} className="space-y-4">
                        <Field label="Contraseña actual" htmlFor="sc-current">
                            <PasswordInput id="sc-current" autoComplete="current-password" value={form.currentPassword} onChange={set("currentPassword")} />
                        </Field>
                        <Field label="Nueva contraseña" htmlFor="sc-new">
                            <PasswordInput id="sc-new" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} />
                            <PasswordStrength value={form.newPassword} />
                        </Field>
                        <Field label="Confirmar nueva contraseña" htmlFor="sc-confirm">
                            <PasswordInput id="sc-confirm" autoComplete="new-password" value={form.newPasswordConfirm} onChange={set("newPasswordConfirm")} />
                        </Field>
                        <FormError message={error} />
                        <div className="flex justify-end">
                            <Button type="submit" loading={saving} disabled={!form.currentPassword || !form.newPassword}>
                                Actualizar contraseña
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MonitorSmartphone className="size-4 text-primary" /> Sesiones
                    </CardTitle>
                    <CardDescription>¿Iniciaste sesión en un computador ajeno? Ciérrala desde aquí.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" loading={closing} onClick={logoutOthers}>
                        <LogOut /> Cerrar otras sesiones
                    </Button>
                </CardContent>
            </Card>

            <TwoFactorCard profile={profile} onChange={reload} />
        </div>
    );
}

/* ------------------------------ Notificaciones ------------------------------ */

function NotificationsTab({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
    const toast = useToast();
    const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("default");
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        setPermission("Notification" in window ? Notification.permission : "unsupported");
    }, []);

    async function save(patch: Partial<Pick<Profile, "notify_email" | "reminder_days">>) {
        setSaving(true);
        try {
            const data = await api<{ profile: Profile }>("/api/profile", {
                method: "PUT",
                body: { name: profile.name, notify_email: patch.notify_email ?? profile.notify_email, reminder_days: patch.reminder_days ?? profile.reminder_days },
            });
            onChange(data.profile);
            toast.success("Preferencias guardadas");
        } catch (error) {
            toast.error("No se pudo guardar", errorMessage(error));
        } finally {
            setSaving(false);
        }
    }

    async function enableBrowser() {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === "granted") {
            new Notification("MizCuentas", { body: "¡Listo! Te avisaremos de tus pagos próximos mientras uses la app.", icon: "/logo.svg" });
        } else {
            toast.info("Permiso no concedido", "Puedes activarlo después desde la configuración del navegador.");
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="size-4 text-primary" /> Recordatorios por correo
                    </CardTitle>
                    <CardDescription>Te escribimos antes de que venza un pago y si alguno queda vencido.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <label className="flex items-center justify-between gap-4">
                        <span>
                            <span className="block text-sm font-medium">Enviarme recordatorios</span>
                            <span className="block text-xs text-muted-foreground">{profile.email_verified ? profile.email : "Primero confirma tu correo para recibirlos."}</span>
                        </span>
                        <Switch checked={profile.notify_email} disabled={saving} onCheckedChange={(v) => save({ notify_email: v })} label="Recordatorios por correo" />
                    </label>
                    <Field label="¿Con cuántos días de anticipación?" htmlFor="nt-days">
                        <SelectField
                            id="nt-days"
                            value={String(profile.reminder_days)}
                            onValueChange={(v) => save({ reminder_days: Number(v) })}
                            options={[1, 2, 3, 5, 7].map((d) => ({ value: String(d), label: `${d} día${d === 1 ? "" : "s"} antes` }))}
                        />
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="size-4 text-primary" /> Notificaciones del navegador
                    </CardTitle>
                    <CardDescription>Un aviso del sistema al abrir MizCuentas cuando tengas pagos que vencen pronto o vencidos.</CardDescription>
                </CardHeader>
                <CardContent>
                    {permission === "unsupported" ? (
                        <p className="text-sm text-muted-foreground">Tu navegador no admite notificaciones.</p>
                    ) : permission === "granted" ? (
                        <Badge tone="success">
                            <BadgeCheck className="size-3.5" /> Activadas en este navegador
                        </Badge>
                    ) : permission === "denied" ? (
                        <p className="text-sm text-muted-foreground">Las bloqueaste en este navegador. Actívalas desde el candado de la barra de direcciones.</p>
                    ) : (
                        <Button onClick={enableBrowser}>
                            <Bell /> Activar notificaciones
                        </Button>
                    )}
                    <p className="mt-4 text-xs text-muted-foreground">La campana de la parte superior siempre muestra tus vencimientos y alertas de presupuesto.</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    const toast = useToast();
    const [profile, setProfile] = React.useState<Profile | null>(null);
    const tabFromQuery = router.query.tab;
    const [tab, setTab] = React.useState<Tab>(tabFromQuery === "seguridad" || tabFromQuery === "notificaciones" ? tabFromQuery : "perfil");

    const load = React.useCallback(async () => {
        try {
            const data = await api<{ profile: Profile }>("/api/profile");
            setProfile(data.profile);
        } catch (error) {
            toast.error("No pudimos cargar tu perfil", errorMessage(error));
        }
    }, [toast]);

    React.useEffect(() => {
        load();
    }, [load]);

    function changeTab(next: Tab) {
        setTab(next);
        router.replace({ pathname: router.pathname, query: next === "perfil" ? {} : { tab: next } }, undefined, { shallow: true, scroll: false });
    }

    return (
        <AppShell title="Mi perfil">
            <PageHeader eyebrow="Mi cuenta" title="Perfil y seguridad" description="Administra tus datos, protege tu cuenta y elige cómo quieres recibir recordatorios." />
            <Segmented
                label="Secciones del perfil"
                value={tab}
                onChange={changeTab}
                className="mt-6"
                options={[
                    { value: "perfil", label: "Perfil" },
                    { value: "seguridad", label: "Seguridad" },
                    { value: "notificaciones", label: "Notificaciones" },
                ]}
            />
            <div key={tab} className="mt-6 animate-fade-up">
                {!profile ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Skeleton className="h-72 rounded-2xl" />
                        <Skeleton className="h-72 rounded-2xl" />
                    </div>
                ) : tab === "perfil" ? (
                    <ProfileTab profile={profile} onChange={setProfile} />
                ) : tab === "seguridad" ? (
                    <SecurityTab profile={profile} reload={load} />
                ) : (
                    <NotificationsTab profile={profile} onChange={setProfile} />
                )}
            </div>
        </AppShell>
    );
}
