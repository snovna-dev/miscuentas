import "@/styles/globals.css";
import Script from "next/script";
import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";
import SEO from "@/components/SEO";
import { ToastProvider } from "@/components/ui/toast";
import { RouteProgress } from "@/components/feedback/Loaders";
import { UserProvider } from "@/contexts/UserContext";
import { TodayProvider } from "@/contexts/TodayContext";
import type { SessionUser } from "@/types";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "G-NLFHM81592";

export default function App({ Component, pageProps }: AppProps<{ user?: SessionUser | null; today?: string }>) {
    return (
        <>
            {GTM_ID && (
                <Script id="google-tag-manager" strategy="afterInteractive">
                    {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
                </Script>
            )}
            <SEO />
            <style jsx global>{`
                :root {
                    --font-geist-sans: ${geistSans.style.fontFamily};
                    --font-geist-mono: ${geistMono.style.fontFamily};
                }
            `}</style>
            <TodayProvider value={pageProps.today}>
            <UserProvider initialUser={pageProps.user ?? null}>
                <ToastProvider>
                    <RouteProgress />
                    <Component {...pageProps} />
                </ToastProvider>
            </UserProvider>
            </TodayProvider>
        </>
    );
}
