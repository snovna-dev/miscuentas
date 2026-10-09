"use client";

import Image from "next/image";
import { Button } from "@/components/buttons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export const Header = () =>{
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/me");
            const data = await res.json();
            setUser(data.user);
        })();
    }, []);

    async function logout() {
        await fetch("/api/logout", { method: "POST" });
        setUser(null);
        router.push("/");
    }

    return(
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4 mb-4 shadow-lg">
            <div className="font-bold max-sm:text-xs hidden sm:block text-foreground">
                <Image
                    src="/Logo.png"
                    alt="Logo"
                    width={40}
                    height={40}
                />
            </div>
            <div className="font-bold text-2xl text-foreground">
                <Link href="/">
                    <h1>MizCuentas</h1>
                </Link>
            </div>

            <div className="ml-auto accent text-white px-4 py-2 rounded">
                <div className="flex items-center justify-center gap-6">

                </div>
            </div>

            {!user && (
                <div className="flex items-center ml-auto gap-2  hover:animate-vibrate animate-in fade-in slide-in-from-right-8 duration-800">
                    <Button href="/auth/logIn" variant={"transparent"}> Iniciar sesion </Button>
                    <Button href="/auth/signUp" variant={"transparent"}> Registrarse </Button>
                </div>
            )}

            {user && (
                <div className="ml-auto flex items-center gap-4 text-sm">
                <span className="font-semibold">Hola, {user.name} 👋</span>

                <Button variant="transparent" onClick={logout}>
                    Cerrar sesión
                </Button>
                </div>
            )}
        </div>
    )
}