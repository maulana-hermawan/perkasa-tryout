"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Flame, PlayCircle, Target, Trophy } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { usePackageAccessMap } from "@/lib/hooks/use-package-access";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Greeting, resume banner and a short progress summary. */
export function DashboardHeader() {
  const { t, tx } = useI18n();
  const user = useCurrentUser();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const accessMap = usePackageAccessMap();

  const stats = useMemo(() => {
    if (!user) return null;
    const finished = db.attempts.filter(
      (attempt) => attempt.userId === user.id && attempt.status !== "in-progress" && attempt.result,
    );
    if (finished.length === 0) return null;
    const average = finished.reduce((sum, attempt) => sum + (attempt.result?.percentage ?? 0), 0) / finished.length;
    const best = Math.max(...finished.map((attempt) => attempt.result?.percentile ?? 0));
    return { completed: finished.length, average: Math.round(average), best };
  }, [db, user]);

  const activeEntry = Object.entries(accessMap).find(([, access]) => Boolean(access.activeAttempt));
  const activePackage = activeEntry ? db.packages.find((item) => item.id === activeEntry[0]) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {user ? (
            <>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {t("catalog.greeting", { name: user.name.split(" ")[0] })}
              </h1>
              <p className="text-sm text-muted-foreground">{t("catalog.greetingSubtitle")}</p>
            </>
          ) : (
            <Skeleton className="h-7 w-40" />
          )}
        </div>

        {stats && (
          <dl className="flex gap-2">
            <Stat icon={Trophy} label={t("catalog.statCompleted")} value={String(stats.completed)} />
            <Stat icon={Target} label={t("catalog.statAverage")} value={`${stats.average}%`} />
            <Stat icon={Flame} label={t("catalog.statBest")} value={String(stats.best)} />
          </dl>
        )}
      </div>

      {!hydrated ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : (
        activePackage &&
        activeEntry && (
          <Card className="flex-row items-center gap-3 border-primary/25 bg-gradient-to-r from-primary/10 to-primary/5 p-3 shadow-card">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <PlayCircle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{tx(activePackage.title)}</p>
              <p className="truncate text-xs text-muted-foreground">{t("catalog.continueHint")}</p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/tryout/${activePackage.id}`}>{t("catalog.continue")}</Link>
            </Button>
          </Card>
        )
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-1.5 text-center shadow-card">
      <dt className="flex items-center justify-center gap-1 text-[0.625rem] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="text-sm font-bold tabular-nums">{value}</dd>
    </div>
  );
}

export default DashboardHeader;
