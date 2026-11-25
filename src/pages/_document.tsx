import { Html, Head, Main, NextScript } from "next/document";
import { themeInitScript } from "@/components/theme/ThemeToggle";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "G-NLFHM81592";

export default function Document() {
    return (
        <Html lang="es-CO" suppressHydrationWarning>
            <Head>
                <meta charSet="utf-8" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="alternate icon" href="/favicon.ico" />
                <link rel="manifest" href="/site.webmanifest" />
                <meta name="theme-color" content="#0d9488" />
                {/* Aplica el tema antes de pintar para evitar el destello blanco en modo oscuro */}
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </Head>
            <body>
                {GTM_ID && (
                    <noscript>
                        <iframe
                            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                            height="0"
                            width="0"
                            style={{ display: "none", visibility: "hidden" }}
                        />
                    </noscript>
                )}
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
