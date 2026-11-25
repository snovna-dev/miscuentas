import type { NextConfig } from "next";
import packageJson from "./package.json";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Política de seguridad de contenido.
 * - Scripts: propios + Google Tag Manager (analítica). `unsafe-inline` es necesario para el
 *   snippet de GTM y el script que evita el parpadeo del tema; `unsafe-eval` solo en desarrollo.
 * - frame-ancestors 'none' impide que la app se embeba en otros sitios (clickjacking).
 */
const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com",
    "font-src 'self' data:",
    `connect-src 'self' ${isDev ? "ws: wss:" : ""} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`,
    "frame-src https://www.googletagmanager.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
]
    .join("; ")
    .replace(/\s{2,}/g, " ");

const securityHeaders = [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
    reactCompiler: true,
    reactStrictMode: true,
    poweredByHeader: false,
    env: {
        NEXT_PUBLIC_APP_VERSION: packageJson.version,
    },
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },
};

export default nextConfig;
