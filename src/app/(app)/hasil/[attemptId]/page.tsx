"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  RotateCcw,
  Timer,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { usePackageAccess } from "@/lib/hooks/use-package-access";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { formatDurationClock } from "@/lib/utils";
import { startAttempt } from "@/lib/exam/service";
import { CheckoutSheet } from "@/components/checkout/checkout-sheet";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function ResultPage() {
  const params = useParams<{ attemptId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const user = useCurrentUser();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [uniqueCode, setUniqueCode] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const attempt = db.attempts.find((item) => item.id === params.attemptId);
  const pkg = attempt ? db.packages.find((item) => item.id === attempt.packageId) : undefined;
  const access = usePackageAccess(attempt?.packageId ?? "");
  const autoSubmitted = search.get("auto") === "1";

  useEffect(() => {
    if (autoSubmitted) toast.info(t("exam.autoSubmitted"));
  }, [autoSubmitted, t]);

  if (!hydrated) return <PageLoader label={t("result.loading")} />;

  if (!attempt || !attempt.result || !pkg) {
    return (
      <Card className="items-center gap-3 py-14 text-center">
        <p className="font-semibold">{t("result.notFound")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">{t("result.backToDashboard")}</Link>
        </Button>
      </Card>
    );
  }

  const result = attempt.result;
  const percentage = result.maxScore > 0 ? result.totalScore / result.maxScore : 0;
  const price = pkg.discountPrice ?? pkg.price;
  const discussionVisible = pkg.showDiscussion && result.perSubtest.length > 0;

  async function handleRetry() {
    if (!user || !pkg || retrying) return;
    setRetrying(true);
    try {
      const next = await startAttempt({ userId: user.id, packageId: pkg.id });
      router.push(`/ruang/${next.id}`);
    } catch {
      setRetrying(false);
      toast.error(t("errors.generic"));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("result.title")}</h1>
        <p className="text-sm text-muted-foreground">{tx(pkg.title)}</p>
      </div>

      {/* Score hero */}
      <Card className="overflow-hidden py-0">
        <div className="bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
          <p className="text-xs opacity-90">{t("result.score")}</p>
          <p className="text-4xl font-bold tracking-tight">
            {formatNumber(result.totalScore, locale, { maximumFractionDigits: 2 })}
            <span className="text-lg font-medium opacity-80"> / {formatNumber(result.maxScore, locale)}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-primary-foreground">
              {t("result.percentage")}: {Math.round(percentage * 100)}%
            </Badge>
            {result.scaledScore !== undefined && (
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground">
                {t("result.scaledScore")}: {result.scaledScore}
              </Badge>
            )}
            {result.passed !== null && (
              <Badge variant="secondary" className={result.passed ? "bg-white/25" : "bg-black/25"}>
                {result.passed ? (
                  <CheckCircle2 className="size-3" />
                ) : (
                  <XCircle className="size-3" />
                )}
                {result.passed ? t("result.passed") : t("result.notPassed")}
              </Badge>
            )}
          </div>
          <Progress value={percentage * 100} className="mt-3 h-1.5 bg-white/25" indicatorClassName="bg-white" />
        </div>

        <CardContent className="space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label={t("result.correct")} value={result.correct} tone="success" icon={CheckCircle2} />
            <Stat label={t("result.wrong")} value={result.wrong} tone="destructive" icon={XCircle} />
            <Stat label={t("result.empty")} value={result.empty} tone="muted" icon={BookOpen} />
          </dl>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="size-3.5" />
                {t("result.percentile")}
              </p>
              <p className="mt-1 text-lg font-bold">{result.percentile}</p>
              <p className="text-[0.6875rem] text-muted-foreground">
                {t("result.percentileDescription", { percentile: 100 - result.percentile })}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="size-3.5" />
                {t("result.rank")}
              </p>
              <p className="mt-1 text-lg font-bold">{formatNumber(result.rank, locale)}</p>
              <p className="text-[0.6875rem] text-muted-foreground">
                {t("result.rankDescription", {
                  rank: formatNumber(result.rank, locale),
                  total: formatNumber(result.totalParticipants, locale),
                })}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="size-3.5" />
                {t("result.duration")}
              </p>
              <p className="mt-1 text-lg font-bold">{formatDurationClock(result.durationSeconds)}</p>
              <p className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                <Clock className="size-3" />
                {formatDateTime(attempt.submittedAt ?? attempt.startedAt, locale)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.status === "awaiting-manual" && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-2">
            <Award className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            <div>
              <p className="text-sm font-semibold">{t("result.awaitingManual")}</p>
              <p className="text-xs text-muted-foreground">{t("result.awaitingManualDescription")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per subtest */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("result.perSubtest")}</CardTitle>
          <CardDescription>{t("result.perSubtestDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.perSubtest.map((subtest) => {
            const ratio = subtest.maxScore > 0 ? subtest.rawScore / subtest.maxScore : 0;
            return (
              <div key={subtest.subtestId} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{tx(subtest.name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("result.subtestScore", {
                        raw: formatNumber(subtest.rawScore, locale, { maximumFractionDigits: 2 }),
                        max: formatNumber(subtest.maxScore, locale),
                      })}
                      {subtest.scaledScore !== undefined &&
                        ` · ${t("result.subtestScaled", { scaled: subtest.scaledScore })}`}
                    </p>
                    <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                      {t("result.correct")}: {subtest.correct} · {t("result.wrong")}: {subtest.wrong} ·{" "}
                      {t("result.empty")}: {subtest.empty} · {formatDurationClock(subtest.secondsUsed)}
                    </p>
                  </div>
                  {subtest.passingGrade !== null && (
                    <Badge variant={subtest.passed ? "success" : "destructive"}>
                      {subtest.passed
                        ? t("result.subtestPass", { grade: subtest.passingGrade })
                        : t("result.subtestFail", { grade: subtest.passingGrade })}
                    </Badge>
                  )}
                </div>
                <Progress
                  value={ratio * 100}
                  className="mt-2 h-1.5"
                  indicatorClassName={subtest.passed === false ? "bg-destructive" : undefined}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Personality profile */}
      {result.dimensions && result.dimensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("result.profile")}</CardTitle>
            <CardDescription>{t("result.profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.dimensions.map((dimension) => (
              <div key={dimension.dimension} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{tx(dimension.label)}</span>
                  <span className="text-muted-foreground">{dimension.score}</span>
                </div>
                <Progress value={dimension.score} indicatorClassName="bg-primary" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gated discussion */}
      {discussionVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {access.discussionUnlocked ? <BookOpen className="size-4" /> : <Lock className="size-4" />}
              {t("result.discussion")}
            </CardTitle>
            <CardDescription>
              {access.discussionUnlocked
                ? t("result.discussionUnlocked")
                : access.state === "pending"
                  ? t("result.unlockPending")
                  : access.state === "rejected"
                    ? t("result.unlockRejected")
                    : t("result.discussionLockedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {access.discussionUnlocked ? (
              <Button asChild className="w-full">
                <Link href={`/hasil/${attempt.id}/pembahasan`}>
                  <BookOpen className="size-4" />
                  {t("result.review")}
                </Link>
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={access.state === "pending"}
                onClick={() => {
                  // Generated in the event handler so rendering stays pure.
                  setUniqueCode(100 + Math.floor(Math.random() * 900));
                  setCheckoutOpen(true);
                }}
              >
                <Lock className="size-4" />
                {t("result.unlockFor", { price: formatCurrency(price, locale) })}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={handleRetry} disabled={retrying || !access.canStart}>
          <RotateCcw className="size-4" />
          {t("result.tryAgain")}
        </Button>
        <Button asChild className="flex-1">
          <Link href="/dashboard">{t("result.backToDashboard")}</Link>
        </Button>
      </div>

      <CheckoutSheet
        pkg={pkg}
        open={checkoutOpen}
        uniqueCode={uniqueCode}
        onOpenChange={setCheckoutOpen}
        onSuccess={() => toast.success(t("result.unlockSuccess"))}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "muted";
  icon: typeof CheckCircle2;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-2">
      <dt className="flex items-center justify-center gap-1 text-[0.6875rem] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd
        className={
          tone === "success" ? "text-lg font-bold text-success" : tone === "destructive" ? "text-lg font-bold text-destructive" : "text-lg font-bold"
        }
      >
        {value}
      </dd>
    </div>
  );
}
