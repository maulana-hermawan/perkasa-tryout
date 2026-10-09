import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { LOCALE_BOOTSTRAP_SCRIPT } from "@/lib/i18n/config";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: {
    default: "TryoutKu — Latihan Tryout SKD CPNS, TOEFL & Psikotes",
    template: "%s · TryoutKu",
  },
  description:
    "Platform tryout online mobile-first: simulasi SKD CPNS, TOEFL ITP, Psikotes dan tes umum dengan timer per subtes, autosave jawaban, pembahasan lengkap, analisis skor, persentil dan ranking nasional. Gratis untuk paket tertentu.",
  applicationName: "TryoutKu",
  keywords: [
    "tryout online",
    "SKD CPNS",
    "TOEFL ITP",
    "psikotes",
    "tes kecermatan",
    "bank soal",
    "simulasi ujian",
  ],
  authors: [{ name: "TryoutKu" }],
  openGraph: {
    title: "TryoutKu — Latihan Tryout SKD CPNS, TOEFL & Psikotes",
    description:
      "Ruang ujian mirip ujian asli: timer per subtes, autosave, nomor soal, pembahasan per soal, serta analisis skor dan ranking nasional.",
    siteName: "TryoutKu",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#14141f" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans antialiased">
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
