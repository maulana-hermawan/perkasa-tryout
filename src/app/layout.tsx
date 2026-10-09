import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { LOCALE_BOOTSTRAP_SCRIPT } from "@/lib/i18n/config";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: {
    default: "TryoutKu — Platform Tryout Online",
    template: "%s · TryoutKu",
  },
  description:
    "Platform tryout online mobile-first untuk SKD CPNS, TOEFL, Psikotes, dan tes umum. Timer, pembahasan, analisis skor, dan sesi live.",
  applicationName: "TryoutKu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0f" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased">
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
