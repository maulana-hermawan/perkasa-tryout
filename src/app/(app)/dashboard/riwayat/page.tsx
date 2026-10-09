"use client";

import Link from "next/link";
import { CheckCircle2, Clock, FileCheck2, XCircle } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDurationClock } from "@/lib/utils";

export default function HistoryPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const user = useCurrentUser();

  const attempts = user
    ? db.attempts
        .filter((attempt) => attempt.userId === user.id && attempt.status !== "in-progress")
        .sort((a, b) => new Date(b.submittedAt ?? b.startedAt).getTime() - new Date(a.submittedAt ?? a.startedAt).getTime())
    : [];

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <Card className="items-center justify-center gap-2 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <FileCheck2 className="size-5 text-muted-foreground" />
        </span>
        <p className="font-semibold">{t("catalog.historyEmptyTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("catalog.historyEmptyDescription")}</p>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("catalog.tabsHistory")}</h2>
        <p className="text-sm text-muted-foreground">{t("common.resultsFound", { count: attempts.length })}</p>
      </div>

      <ul className="space-y-3">
        {attempts.map((attempt) => {
          const pkg = db.packages.find((item) => item.id === attempt.packageId);
          const result = attempt.result;
          return (
            <li key={attempt.id}>
              <Card className="gap-3 py-0">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{pkg ? tx(pkg.title) : attempt.packageId}</p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.submittedAt ? formatDateTime(attempt.submittedAt, locale) : "-"}
                      </p>
                    </div>
                    {result && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          {result.scaledScore ?? formatNumber(Math.round(result.totalScore), locale)}
                        </p>
                        <p className="text-[0.6875rem] text-muted-foreground">
                          {t("catalog.historyScore", {
                            score: `${result.percentage}%`,
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {result && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="size-3.5" />
                        {result.correct} {t("common.questions")}
                      </span>
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="size-3.5" />
                        {result.wrong}
                      </span>
                      <span>{t("catalog.emptyCount", { count: result.empty })}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {formatDurationClock(result.durationSeconds)}
                      </span>
                      {result.percentile > 0 && (
                        <span>{t("catalog.percentile", { value: result.percentile })}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {result?.passed !== null && result?.passed !== undefined && (
                        <Badge variant={result.passed ? "success" : "destructive"}>
                          {result.passed ? t("catalog.passed") : t("catalog.failed")}
                        </Badge>
                      )}
                      {result?.status === "awaiting-manual" && (
                        <Badge variant="warning">{t("result.awaitingShort")}</Badge>
                      )}
                    </div>
                    {result && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/hasil/${attempt.id}`}>{t("catalog.review")}</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
