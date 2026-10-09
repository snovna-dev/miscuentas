"use client";

import Image from "next/image";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";

const links = [
  { label: "Iniciar sesión", href: "/auth/logIn" },
  { label: "Registrarse", href: "/auth/signUp" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1 lg:px-8">
        
        <Image
            src="/Logo.png"
            alt="Logo"
            width={90}
            height={90}
        />

        {/* Desktop */}
        <div className="hidden items-center gap-8 lg:flex">
          <div className="flex gap-6">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition hover:text-cyan-600"
              >
                {link.label}
              </a>
            ))}
          </div>

          <a
            href="/"
            className="rounded-full bg-cyan-500 p-3 text-white transition hover:bg-cyan-600"
          >
            <User size={20} />
          </a>
        </div>

        {/* Mobile button */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 lg:hidden"
          aria-label="Abrir menú"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-slate-700 hover:text-cyan-600"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}