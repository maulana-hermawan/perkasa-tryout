"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Flag,
  Grid2x2,
  Headphones,
  Languages,
  ListChecks,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/store/auth";
import { formatCompact, formatNumber } from "@/lib/format";
import { SEED_CATEGORIES, SEED_TEST_TYPES } from "@/lib/seed";
import { BrandMark } from "@/components/common/brand";
import { DynamicIcon } from "@/components/common/dynamic-icon";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  const { t, tx, locale } = useI18n();
  const user = useCurrentUser();

  const stats = [
    { value: formatNumber(12_480, locale), label: t("landing.statUsers"), icon: Brain },
    { value: formatCompact(486_000, locale), label: t("landing.statAttempts"), icon: ClipboardList },
    { value: formatNumber(1_284, locale), label: t("landing.statQuestions"), icon: BarChart3 },
    { value: "4.7", label: t("landing.statRating"), icon: Star },
  ];

  const features = [
    {
      icon: ListChecks,
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

  const steps = [
    { number: "1", title: t("landing.step1Title"), description: t("landing.step1Description") },
    { number: "2", title: t("landing.step2Title"), description: t("landing.step2Description") },
    { number: "3", title: t("landing.step3Title"), description: t("landing.step3Description") },
  ];

  const plans = [
    {
      title: t("landing.plan1Title"),
      price: t("landing.plan1Price"),
      description: t("landing.plan1Description"),
      features: [t("landing.plan1Feature1"), t("landing.plan1Feature2"), t("landing.plan1Feature3")],
      highlight: false,
    },
    {
      title: t("landing.plan2Title"),
      price: t("landing.plan2Price"),
      description: t("landing.plan2Description"),
      features: [t("landing.plan2Feature1"), t("landing.plan2Feature2"), t("landing.plan2Feature3")],
      highlight: true,
    },
    {
      title: t("landing.plan3Title"),
      price: t("landing.plan3Price"),
      description: t("landing.plan3Description"),
      features: [t("landing.plan3Feature1"), t("landing.plan3Feature2"), t("landing.plan3Feature3")],
      highlight: false,
    },
  ];

  const faqs = [
    { question: t("landing.faq1Question"), answer: t("landing.faq1Answer") },
    { question: t("landing.faq2Question"), answer: t("landing.faq2Answer") },
    { question: t("landing.faq3Question"), answer: t("landing.faq3Answer") },
    { question: t("landing.faq4Question"), answer: t("landing.faq4Answer") },
    { question: t("landing.faq5Question"), answer: t("landing.faq5Answer") },
  ];

  const navLinks = [
    { href: "#fitur", label: t("landing.navFeatures") },
    { href: "#cara-kerja", label: t("landing.navHow") },
    { href: "#jenis-tes", label: t("landing.navTypes") },
    { href: "#harga", label: t("landing.navPricing") },
    { href: "#faq", label: t("landing.navFaq") },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2 rounded-lg">
            <BrandMark />
            <span className="text-[1.0625rem] font-bold tracking-tight">
              Tryout<span className="text-primary">Ku</span>
            </span>
          </Link>

          <nav aria-label={t("nav.mainNavigation")} className="ml-6 hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm" className="ml-1">
                <Link href={user.role === "participant" ? "/dashboard" : "/admin"}>{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">{t("landing.ctaSecondary")}</Link>
                </Button>
                <Button asChild size="sm" className="ml-1">
                  <Link href="/register">{t("landing.ctaPrimary")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------- hero ------------------------------- */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-violet-500/10 to-transparent blur-3xl"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
                <Sparkles className="size-3.5 text-primary" />
                {t("landing.heroBadge")}
              </span>

              <h1 className="mt-5 text-[2rem] leading-[1.15] font-bold tracking-tight text-balance sm:text-5xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
                {t("landing.heroSubtitle")}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button asChild size="lg" className="shadow-pop">
                  <Link href="/register">
                    {t("landing.ctaPrimary")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">{t("landing.ctaSecondary")}</Link>
                </Button>
              </div>

              <ul className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-5">
                <li className="flex items-center gap-1.5 sm:justify-start">
                  <Check className="size-4 text-success" />
                  {t("landing.heroStat1")}
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-success" />
                  {t("profile.demoNotice")}
                </li>
              </ul>
            </div>

            {/* Product preview — a static mock of the exam room */}
            <div className="relative mx-auto w-full max-w-sm lg:max-w-none" aria-hidden>
              <div className="rounded-[1.75rem] border border-border bg-card p-2 shadow-pop">
                <div className="overflow-hidden rounded-[1.25rem] bg-muted/30">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-semibold">{t("brand.name")}</p>
                      <p className="truncate text-[0.6875rem] text-muted-foreground">{t("landing.previewProgress")}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
                      <Clock className="size-3" />
                      {t("landing.previewTimer")}
                    </span>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground">
                      <span>{t("landing.previewSubtest")}</span>
                      <span>{t("landing.previewQuestion")}</span>
                    </div>

                    <p className="text-sm leading-relaxed font-medium">{t("landing.previewPrompt")}</p>

                    <div className="space-y-2">
                      {[
                        t("landing.previewOption1"),
                        t("landing.previewOption2"),
                        t("landing.previewOption3"),
                        t("landing.previewOption4"),
                      ].map((option, index) => (
                        <div
                          key={option}
                          className={
                            index === 1
                              ? "flex items-center gap-2.5 rounded-xl border border-primary bg-primary/5 p-2.5"
                              : "flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5"
                          }
                        >
                          <span
                            className={
                              index === 1
                                ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-bold text-primary-foreground"
                                : "flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[0.6875rem] font-semibold"
                            }
                          >
                            {"ABCD"[index]}
                          </span>
                          <span className="truncate text-xs">{option}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3 text-[0.6875rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Flag className="size-3" />
                        {t("landing.previewMark")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Grid2x2 className="size-3" />
                        {t("landing.previewAnswered")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-2 hidden rounded-xl border border-border bg-card px-3 py-2 shadow-pop sm:block">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Headphones className="size-3.5 text-primary" />
                  {t("landing.previewLabel")}
                </p>
              </div>
            </div>
          </div>

          <dl className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-border bg-card p-3 text-center shadow-card">
                  <Icon className="mx-auto size-4 text-primary" />
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="mt-1 text-xl font-bold tracking-tight">{stat.value}</dd>
                  <p className="text-[0.6875rem] text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </dl>
        </section>

        {/* ----------------------------- categories ---------------------------- */}
        <section className="border-y border-border bg-muted/30 py-10">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.typesTitle")}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{t("landing.typesSubtitle")}</p>
            </div>

            <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SEED_TEST_TYPES.slice()
                .sort((a, b) => a.order - b.order)
                .map((type) => (
                  <li
                    key={type.id}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <DynamicIcon name={type.icon} className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{tx(type.name)}</p>
                      {type.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tx(type.description)}</p>
                      )}
                    </div>
                  </li>
                ))}
            </ul>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SEED_CATEGORIES.slice()
                .sort((a, b) => a.order - b.order)
                .map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
                  >
                    <DynamicIcon name={category.icon} className="size-3.5 text-primary" />
                    {tx(category.name)}
                  </span>
                ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ features ----------------------------- */}
        <section id="fitur" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.featuresTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("landing.featuresSubtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="shadow-card transition-shadow hover:shadow-pop">
                  <CardHeader>
                    <span
                      className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.tint}`}
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

        {/* ---------------------------- how it works --------------------------- */}
        <section id="cara-kerja" className="scroll-mt-20 border-y border-border bg-muted/30 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.stepsTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("landing.stepsSubtitle")}</p>
            </div>

            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <li key={step.number} className="relative rounded-2xl border border-border bg-card p-5 shadow-card">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step.number}
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------- pricing ----------------------------- */}
        <section id="harga" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.pricingTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.pricingSubtitle")}</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.title}
                className={
                  plan.highlight
                    ? "border-primary/40 shadow-pop ring-1 ring-primary/20"
                    : "shadow-card"
                }
              >
                <CardHeader>
                  {plan.highlight && (
                    <span className="w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
                      {t("landing.planPopular")}
                    </span>
                  )}
                  <CardTitle>{plan.title}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="pt-1 text-2xl font-bold tracking-tight">{plan.price}</p>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={plan.highlight ? "default" : "outline"} className="w-full">
                    <Link href="/dashboard">{t("landing.planCta")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* --------------------------------- faq ------------------------------- */}
        <section id="faq" className="scroll-mt-20 border-y border-border bg-muted/30 py-14">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.faqTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("landing.faqSubtitle")}</p>
            </div>

            <div className="mt-8 space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-border bg-card px-4 shadow-card open:shadow-pop"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------- cta ------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Card className="overflow-hidden border-transparent bg-gradient-to-br from-indigo-600 via-primary to-violet-700 text-white shadow-pop">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-12">
              <Clock className="size-8 opacity-90" />
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.ctaTitle")}</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/85">
                  {t("landing.ctaDescription")}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Link href="/register">
                    {t("landing.ctaPrimary")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
                >
                  <Link href="/login">{t("landing.ctaSecondary")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/30 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-base font-bold tracking-tight">
              <BrandMark className="size-6 rounded-lg" />
              Tryout<span className="text-primary">Ku</span>
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("landing.footerTagline")}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Languages className="size-3.5" />
              {t("landing.builtWith")}
            </p>
          </div>

          {[
            {
              title: t("landing.footerProduct"),
              links: [
                { label: t("landing.footerCatalog"), href: "/dashboard" },
                { label: t("landing.footerSessions"), href: "/dashboard/gabung" },
                { label: t("landing.footerPricing"), href: "#harga" },
              ],
            },
            {
              title: t("landing.footerSupport"),
              links: [
                { label: t("landing.footerHelp"), href: "#faq" },
                { label: t("landing.footerContact"), href: "#faq" },
                { label: t("landing.footerTerms"), href: "#faq" },
              ],
            },
            {
              title: t("landing.footerCompany"),
              links: [
                { label: t("landing.footerAbout"), href: "#fitur" },
                { label: t("landing.footerPrivacy"), href: "#faq" },
                { label: t("landing.ctaSecondary"), href: "/login" },
              ],
            },
          ].map((column) => (
            <nav key={column.title} aria-label={column.title} className="space-y-2">
              <p className="text-xs font-semibold tracking-wide uppercase">{column.title}</p>
              <ul className="space-y-1.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-6xl border-t border-border px-4 pt-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TryoutKu. {t("landing.footerRights")}
        </div>
      </footer>
    </div>
  );
}
