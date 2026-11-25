import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getUserBySessionToken, homePathFor, SESSION_COOKIE_NAME } from "@/lib/auth";
import { serverToday } from "@/lib/serverTime";
import type { SessionUser } from "@/types";

/**
 * Niveles de acceso de las páginas:
 * - guest:      landing, login y registro. Si ya hay sesión, redirige a su inicio.
 * - user:       requiere sesión y onboarding completo.
 * - onboarding: requiere sesión y onboarding pendiente.
 * - admin:      requiere sesión de administrador.
 */
export type PageAccess = "guest" | "user" | "onboarding" | "admin";

/** `today` (YYYY-MM-DD en la zona de negocio) evita diferencias de fecha entre servidor y navegador. */
export type PageProps = { user: SessionUser | null; today: string };
export type AuthedPageProps = { user: SessionUser; today: string };

async function userFromContext(ctx: GetServerSidePropsContext) {
    const token = ctx.req.cookies?.[SESSION_COOKIE_NAME];
    if (!token) return null;

    try {
        return await getUserBySessionToken(token);
    } catch (error) {
        console.error("[ssr] No fue posible validar la sesión", error);
        return null;
    }
}

function safeNext(value: unknown) {
    if (typeof value !== "string") return null;
    if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
    return value;
}

function redirect(destination: string) {
    return { redirect: { destination, permanent: false } } as const;
}

export function withPageAuth(access: PageAccess): GetServerSideProps<PageProps> {
    return async (ctx) => {
        ctx.res.setHeader("Cache-Control", "private, no-store");
        const user = await userFromContext(ctx);

        if (access === "guest") {
            if (user) return redirect(safeNext(ctx.query.next) ?? homePathFor(user));
            return { props: { user: null, today: serverToday() } };
        }

        if (!user) {
            const next = encodeURIComponent(ctx.resolvedUrl || "/");
            return redirect(`/auth/logIn?next=${next}`);
        }

        if (access === "admin" && !user.isAdmin) return redirect("/user/dashboard");
        if (access === "user" && user.needsOnboarding) return redirect("/user/onboarding");
        if (access === "onboarding" && !user.needsOnboarding) return redirect(homePathFor(user));

        return { props: { user, today: serverToday() } };
    };
}
