"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ClipboardList,
  Clock,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/store/auth";
import { formatCompact, formatNumber } from "@/lib/format";
import { BrandMark } from "@/components/common/brand";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  const { t, locale } = useI18n();
  const user = useCurrentUser();

  const stats = [
    { value: formatNumber(12_480, locale), label: t("landing.statUsers"), icon: Brain },
    { value: formatCompact(486_000, locale), label: t("landing.statAttempts"), icon: ClipboardList },
    { value: formatNumber(1_284, locale), label: t("landing.statQuestions"), icon: BarChart3 },
    { value: "4.7", label: t("landing.statRating"), icon: Star },
  ];

  const features = [
    {
      icon: Brain,
      title: t("landing.feature1Title"),
      description: t("landing.feature1Description"),
      tint: "from-violet-500/15 to-indigo-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      icon: Timer,
      title: t("landing.feature2Title"),
      description: t("landing.feature2Description"),
      tint: "from-sky-500/15 to-cyan-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      icon: BarChart3,
      title: t("landing.feature3Title"),
      description: t("landing.feature3Description"),
      tint: "from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Radio,
      title: t("landing.feature4Title"),
      description: t("landing.feature4Description"),
      tint: "from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark />
            <span className="text-[1.0625rem] font-bold tracking-tight">
              Tryout<span className="text-primary">Ku</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild size="sm" className="ml-1">
              <Link href={user ? (user.role === "participant" ? "/dashboard" : "/admin") : "/login"}>
                {user ? t("nav.dashboard") : t("landing.ctaSecondary")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                {t("landing.featuresSubtitle")}
              </span>
              <h1 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="mt-4 text-base text-muted-foreground text-pretty sm:text-lg">
                {t("landing.heroSubtitle")}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild size="lg">
                  <Link href="/register">
                    {t("landing.ctaPrimary")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">{t("landing.ctaSecondary")}</Link>
                </Button>
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                {t("profile.demoNotice")}
              </p>
            </div>

            <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center">
                    <Icon className="mx-auto size-4 text-primary" />
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="mt-1 text-lg font-bold">{stat.value}</dd>
                    <p className="text-[0.6875rem] text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.featuresTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.featuresSubtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/70">
                  <CardHeader>
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.tint}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <Card className="overflow-hidden border-transparent bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Clock className="size-8 opacity-90" />
              <div>
                <h2 className="text-2xl font-bold">{t("landing.ctaTitle")}</h2>
                <p className="mt-1 text-sm text-white/80">{t("landing.ctaDescription")}</p>
              </div>
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">
                  {t("landing.ctaPrimary")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <BrandMark className="size-4 rounded-[0.35rem]" />
            © {new Date().getFullYear()} TryoutKu. {t("landing.footerRights")}
          </p>
          <p>{t("landing.builtWith")}</p>
        </div>
      </footer>
    </div>
  );
}
