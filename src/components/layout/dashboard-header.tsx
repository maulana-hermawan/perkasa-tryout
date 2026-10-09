"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { usePackageAccessMap } from "@/lib/hooks/use-package-access";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeader() {
  const { t, tx } = useI18n();
  const user = useCurrentUser();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const accessMap = usePackageAccessMap();

  const activeEntry = Object.entries(accessMap).find(([, access]) => Boolean(access.activeAttempt));
  const activePackage = activeEntry ? db.packages.find((item) => item.id === activeEntry[0]) : undefined;

  return (
    <div className="space-y-3">
      <div>
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

      {!hydrated ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : (
        activePackage &&
        activeEntry && (
          <Card className="flex-row items-center gap-3 border-primary/25 bg-primary/5 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <PlayCircle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{tx(activePackage.title)}</p>
              <p className="text-xs text-muted-foreground">{t("catalog.inProgress")}</p>
            </div>
            <Button asChild size="sm">
              <Link href={`/tryout/${activePackage.id}`}>{t("catalog.continue")}</Link>
            </Button>
          </Card>
        )
      )}
    </div>
  );
}

export default DashboardHeader;
