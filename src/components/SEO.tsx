import Head from "next/head";

const siteUrl = "https://snovna.online";

export default function SEO() {
  const title = "MizCuentas";

  const description =
    "MizCuentas es una aplicación web que permite a los usuarios llevar un registro de sus gastos e ingresos, ayudándoles a gestionar sus finanzas personales de manera eficiente y efectiva.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "MizCuentas",
        description,
        inLanguage: "es-CO",
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: title,
        description,
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        inLanguage: "es-CO",
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#person`,
        name: "Michael Fabian Rojas Sabogal",
        url: siteUrl,
        jobTitle: "Desarrollador de software",
        knowsAbout: [
          "React",
          "TypeScript",
          "Java",
          "Spring Boot",
          "Laravel",
          "Livewire",
          "JavaScript",
          "SQL",
          "Tailwind CSS",
          "Git",
        ],
      },
    ],
  };

  return (
    <Head>
      <title>{title}</title>

      <meta
        name="description"
        content={description}
      />

      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />

      <link rel="canonical" href={`${siteUrl}/`} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${siteUrl}/`} />
      <meta property="og:site_name" content="Snovna" />
      <meta property="og:locale" content="es_CO" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </Head>
  );
}