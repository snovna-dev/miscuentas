import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es-CO">
      <Head>
        <meta charSet="utf-8" />
      </Head>
      <body className="antialiased">
        <noscript>
            <iframe
                src="https://www.googletagmanager.com/ns.html?id=G-NLFHM81592"
                height="0"
                width="0"
                style={{
                    display: "none",
                    visibility: "hidden",
                }}
            />
        </noscript>

        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
