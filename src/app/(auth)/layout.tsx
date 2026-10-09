"use client";

import { Check, Sparkles } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { AppHeader } from "@/components/layout/app-header";
import { BrandMark } from "@/components/common/brand";

/**
 * Split layout: a short value pitch on the left (desktop only) and the form on
 * the right. On mobile the panel is dropped so the form is the whole screen —
 * nothing to scroll past before you can sign in.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  const points = [t("auth.panelPoint1"), t("auth.panelPoint2"), t("auth.panelPoint3")];

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="flex flex-1 lg:grid lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-primary to-violet-700 p-10 lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-white/10 blur-3xl"
          />

          <div className="relative flex items-center gap-2 text-white">
            <BrandMark className="bg-white/15 text-white" />
            <span className="text-lg font-bold tracking-tight">
              Tryout<span className="text-white/70">Ku</span>
            </span>
          </div>

          <div className="relative max-w-md text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" />
              {t("landing.heroBadge")}
            </span>
            <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance">
              {t("auth.panelTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85">{t("auth.panelSubtitle")}</p>

            <ul className="mt-6 space-y-3">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Check className="size-3" />
                  </span>
                  <span className="text-white/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/70">{t("profile.demoNotice")}</p>
        </aside>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
