import * as React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/buttons";
import { Card, CardContent } from "@/components/ui/primitives";
import { PageLoader } from "@/components/feedback/Loaders";
import { Confetti } from "@/components/feedback/Confetti";
import { useUser } from "@/contexts/UserContext";
import { api, errorMessage } from "@/lib/client/api";
import type { GetServerSideProps } from "next";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { serverToday } from "@/lib/serverTime";

// Página accesible con o sin sesión: el enlace puede abrirse en otro dispositivo.
export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const token = ctx.req.cookies?.[SESSION_COOKIE_NAME];
    const user = token ? await getUserBySessionToken(token).catch(() => null) : null;
    return { props: { user, today: serverToday() } };
};

export default function VerifyEmail() {
    const router = useRouter();
    const { user, setUser } = useUser();
    const [state, setState] = React.useState<{ status: "loading" | "ok" | "error"; message?: string }>({ status: "loading" });
    const done = React.useRef(false);

    React.useEffect(() => {
        if (!router.isReady || done.current) return;
        done.current = true;
        const token = typeof router.query.token === "string" ? router.query.token : "";
        api("/api/auth/verify-email", { method: "POST", body: { token } })
            .then(() => {
                setState({ status: "ok" });
                if (user) setUser({ ...user, emailVerified: true });
            })
            .catch((error) => setState({ status: "error", message: errorMessage(error) }));
    }, [router.isReady, router.query.token, user, setUser]);

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-grid px-4">
            <Head>
                <title>Verificar correo · MizCuentas</title>
            </Head>
            {state.status === "ok" && <Confetti burstKey={1} />}
            <Logo className="mb-8" />
            <Card className="w-full max-w-md text-center">
                <CardContent className="space-y-5 py-10">
                    {state.status === "loading" ? (
                        <PageLoader label="Confirmando tu correo…" className="min-h-40" />
                    ) : state.status === "ok" ? (
                        <>
                            <CheckCircle2 className="mx-auto size-14 text-success animate-pop" />
                            <div className="space-y-1">
                                <h1 className="text-2xl font-semibold">¡Correo confirmado!</h1>
                                <p className="text-sm text-muted-foreground">Ya puedes recibir recordatorios de pago y recuperar tu cuenta si lo necesitas.</p>
                            </div>
                            <Button href={user ? "/user/dashboard" : "/auth/logIn"} size="lg">
                                {user ? "Ir a mi tablero" : "Iniciar sesión"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <XCircle className="mx-auto size-14 text-destructive animate-pop" />
                            <div className="space-y-1">
                                <h1 className="text-2xl font-semibold">No pudimos confirmar tu correo</h1>
                                <p className="text-sm text-muted-foreground">{state.message}</p>
                            </div>
                            <Button href={user ? "/user/profile" : "/auth/logIn"} variant="outline">
                                {user ? "Solicitar un nuevo enlace" : "Iniciar sesión"}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
