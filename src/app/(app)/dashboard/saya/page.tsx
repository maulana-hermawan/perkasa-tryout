"use client";

import { useMemo } from "react";

import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { usePackageAccessMap } from "@/lib/hooks/use-package-access";
import { CatalogSkeleton, getPackageCta } from "@/components/catalog/catalog-grid";
import { PackageCard } from "@/components/catalog/package-card";
import { Card } from "@/components/ui/card";

export default function MyTryoutsPage() {
  const { t } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const user = useCurrentUser();
  const accessMap = usePackageAccessMap();

  const items = useMemo(() => {
    if (!user) return [];
    const owned = new Set<string>();
    db.attempts.filter((attempt) => attempt.userId === user.id).forEach((attempt) => owned.add(attempt.packageId));
    db.payments
      .filter((payment) => payment.userId === user.id)
      .forEach((payment) => payment.packageId && owned.add(payment.packageId));
    return db.packages
      .filter((pkg) => owned.has(pkg.id) && pkg.status === "published")
      .sort((a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime());
  }, [db, user]);

  if (!hydrated) return <CatalogSkeleton count={3} />;

  if (items.length === 0) {
    return (
      <Card className="items-center justify-center gap-2 py-12 text-center">
        <p className="font-semibold">{t("catalog.myEmptyTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("catalog.myEmptyDescription")}</p>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("catalog.tabsMy")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("common.resultsFound", { count: items.length })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((pkg) => {
          const access = accessMap[pkg.id] ?? { state: "locked", canStart: false, discussionUnlocked: false };
          return (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              category={db.categories.find((category) => category.id === pkg.categoryId)}
              access={access.state}
              href={`/tryout/${pkg.id}`}
              cta={getPackageCta(pkg, access, t)}
            />
          );
        })}
      </div>
    </section>
  );
}
