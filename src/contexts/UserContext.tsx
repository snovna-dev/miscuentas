import * as React from "react";
import { useRouter } from "next/router";
import { api } from "@/lib/client/api";
import type { SessionUser } from "@/types";

type UserContextValue = {
    user: SessionUser | null;
    setUser: (user: SessionUser | null) => void;
    logout: () => Promise<void>;
};

const UserContext = React.createContext<UserContextValue | null>(null);

/**
 * El usuario llega desde getServerSideProps (validado en el servidor) y se comparte en
 * toda la app. Antes el header y cada formulario llamaban a /api/me por separado.
 */
export function UserProvider({ initialUser, children }: { initialUser: SessionUser | null; children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = React.useState<SessionUser | null>(initialUser);
    const [lastInitial, setLastInitial] = React.useState(initialUser);

    // Sincroniza cuando una navegación trae un usuario distinto desde el servidor.
    if (initialUser !== lastInitial) {
        setLastInitial(initialUser);
        setUser(initialUser);
    }

    const logout = React.useCallback(async () => {
        try {
            await api("/api/logout", { method: "POST" });
        } finally {
            setUser(null);
            await router.push("/");
        }
    }, [router]);

    const value = React.useMemo(() => ({ user, setUser, logout }), [user, logout]);
    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = React.useContext(UserContext);
    if (!context) throw new Error("useUser debe usarse dentro de <UserProvider>");
    return context;
}
