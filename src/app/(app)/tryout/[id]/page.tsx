"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Gauge,
  HelpCircle,
  Lock,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { formatCompact, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { usePackageAccess } from "@/lib/hooks/use-package-access";
import { useDbHydrated, useDatabase } from "@/lib/store/db";
import { cn } from "@/lib/utils";
import { CheckoutSheet } from "@/components/checkout/checkout-sheet";
import { DynamicIcon } from "@/components/common/dynamic-icon";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export default function TryoutDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const access = usePackageAccess(params.id);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [uniqueCode, setUniqueCode] = useState(0);

  if (!hydrated) return <PageLoader />;

  const pkg = db.packages.find((item) => item.id === params.id);
  if (!pkg) {
    return (
      <Card className="items-center gap-3 py-14 text-center">
        <p className="font-semibold">{t("package.notFound")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">{t("package.backToCatalog")}</Link>
        </Button>
      </Card>
    );
  }

  const category = db.categories.find((item) => item.id === pkg.categoryId);
  const testType = db.testTypes.find((item) => item.id === pkg.testTypeId);

  const ctaLabel = access.activeAttempt
    ? t("catalog.continue")
    : access.canStart
      ? t("package.startNow")
      : access.state === "pending"
        ? t("catalog.waitingPayment")
        : access.state === "rejected"
          ? t("catalog.buy")
          : access.lastAttempt
            ? t("pricing.unlockCta")
            : t("catalog.buy");

  const ctaDisabled = access.state === "pending";

  function handleCta() {
    if (access.state === "pending") return;
    if (access.canStart || access.activeAttempt) {
      setStartOpen(true);
      return;
    }
    // Generated in the event handler so rendering stays pure.
    setUniqueCode(100 + Math.floor(Math.random() * 900));
    setCheckoutOpen(true);
  }

  return (
    <div className="space-y-4 pb-40 md:pb-32">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        {t("package.backToCatalog")}
      </Button>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="relative aspect-[16/8] w-full">
          <div
            className="flex size-full items-center justify-center"
            style={{
              backgroundImage: `linear-gradient(135deg, ${pkg.thumbnail.kind === "gradient" ? pkg.thumbnail.from : "#4f46e5"}, ${
                pkg.thumbnail.kind === "gradient" ? pkg.thumbnail.to : "#7c3aed"
              })`,
            }}
          >
            <DynamicIcon
              name={pkg.thumbnail.kind === "gradient" ? pkg.thumbnail.icon : undefined}
              className="size-14 text-white/90"
            />
          </div>
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge variant={pkg.pricingModel === "free" ? "success" : pkg.pricingModel === "freemium" ? "warning" : "default"}>
              {t(`pricing.${pkg.pricingModel}Short`)}
            </Badge>
            {category && (
              <Badge variant="secondary" className="bg-white/85 text-foreground">
                {tx(category.name)}
              </Badge>
            )}
          </div>
        </div>

        <CardHeader className="pt-4">
          <CardTitle className="text-lg leading-snug">{tx(pkg.title)}</CardTitle>
          <CardDescription>{tx(pkg.description)}</CardDescription>
          {pkg.publishedAt && (
            <p className="text-xs text-muted-foreground">
              {t("catalog.publishedAt", { date: formatDate(pkg.publishedAt, locale) })}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={HelpCircle} label={t("common.questions")} value={formatNumber(pkg.totalQuestions, locale)} />
            <Stat icon={Clock} label={t("common.minutes")} value={formatNumber(pkg.durationMinutes, locale)} />
            <Stat icon={Users} label={t("package.participants")} value={formatCompact(pkg.participantCount, locale)} />
            <Stat
              icon={Star}
              label={t("landing.statRating")}
              value={pkg.rating > 0 ? pkg.rating.toFixed(1) : "-"}
            />
          </div>

          <Separator />

          <div>
            <h2 className="mb-2 text-sm font-semibold">{t("package.structure")}</h2>
            <ul className="space-y-2">
              {pkg.subtests.map((entry) => {
                const subtest = db.subtests.find((item) => item.id === entry.subtestId);
                if (!subtest) return null;
                const count = entry.questionIds.length || subtest.questionCount;
                const minutes = subtest.durationMinutes ?? Math.round(pkg.durationMinutes / pkg.subtests.length);
                return (
                  <li key={entry.subtestId} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{tx(subtest.name)}</p>
                        {subtest.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{tx(subtest.description)}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium">
                        {t("package.subtestQuestions", { count })}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[0.6875rem]">
                      <Badge variant="muted">
                        <Clock className="size-3" />
                        {t("package.subtestDuration", { count: minutes })}
                      </Badge>
                      <Badge variant="muted">
                        {t("package.scoringCorrect", { value: subtest.scoring.correct })}
                      </Badge>
                      <Badge variant="muted">{t("package.scoringWrong", { value: subtest.scoring.wrong })}</Badge>
                      <Badge variant="muted">{t("package.scoringEmpty", { value: subtest.scoring.empty })}</Badge>
                      {subtest.passingGrade !== null && (
                        <Badge variant="outline">
                          <Gauge className="size-3" />
                          {t("package.passingGrade", { value: subtest.passingGrade })}
                        </Badge>
                      )}
                      {subtest.generator && <Badge variant="accent">{t("package.generated")}</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="mb-2 text-sm font-semibold">{t("package.includes")}</h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {[
                t("package.includesScore"),
                t("package.includesRanking"),
                pkg.showDiscussion ? t("package.includesDiscussion") : null,
                t("package.includesCertificate"),
              ]
                .filter(Boolean)
                .map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 text-success" />
                    {item}
                  </li>
                ))}
            </ul>
          </div>

          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <FileText className="size-3.5" />
              {testType ? tx(testType.name) : "-"}
            </p>
            <p className="mt-1">{testType && testType.description ? tx(testType.description) : ""}</p>
          </div>
        </CardContent>
      </Card>

      {/* Sticky, thumb-reachable CTA */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-border bg-background/95 px-4 pt-3 pb-3 backdrop-blur-md md:bottom-0 md:pb-safe">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {pkg.pricingModel === "free" ? (
              <span className="text-lg font-bold text-success">{t("common.free")}</span>
            ) : (
              <div>
                {pkg.discountPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(pkg.price, locale)}
                  </span>
                )}
                <p className="text-lg leading-tight font-bold">
                  {formatCurrency(pkg.discountPrice ?? pkg.price, locale)}
                </p>
              </div>
            )}
            <p className="truncate text-[0.6875rem] text-muted-foreground">
              {access.state === "freemium-locked"
                ? t("pricing.freemiumDescription")
                : access.discussionUnlocked
                  ? t("pricing.freeDescription")
                  : t("pricing.paidDescription")}
            </p>
          </div>
          <Button size="lg" onClick={handleCta} disabled={ctaDisabled} className="min-w-[8.5rem]">
            {access.state === "pending" ? <Lock className="size-4" /> : <PlayCircle className="size-4" />}
            {ctaLabel}
          </Button>
        </div>
      </div>

      <CheckoutSheet
        pkg={pkg}
        open={checkoutOpen}
        uniqueCode={uniqueCode}
        onOpenChange={setCheckoutOpen}
      />

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2")}>
              <PlayCircle className="size-5 text-primary" />
              {t("catalog.startSoon")}
            </DialogTitle>
            <DialogDescription>{t("catalog.startSoonDesc")}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setStartOpen(false)}>{t("common.close")}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border p-2.5">
      <p className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-0.5 text-base font-bold">{value}</p>
    </div>
  );
}
