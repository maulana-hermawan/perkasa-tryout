"use client";

import { ThemeProvider } from "next-themes";
import type { Locale } from "@/types";
import { I18nProvider } from "@/lib/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppBootstrap } from "./app-bootstrap";

export function AppProviders({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider initialLocale={locale}>
        <TooltipProvider delayDuration={200}>
          <AppBootstrap>{children}</AppBootstrap>
          <Toaster position="top-center" />
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default AppProviders;
