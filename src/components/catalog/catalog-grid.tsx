"use client";

import { SearchX } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageCard } from "./package-card";
import type { PackageAccess } from "@/lib/hooks/use-package-access";
import type { Category, TryoutPackage } from "@/types";

export function getPackageCta(
  pkg: TryoutPackage,
  access: PackageAccess,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (access.activeAttempt) return { label: t("catalog.continue"), href: `/tryout/${pkg.id}`, variant: "default" as const };
  if (access.lastAttempt && access.lastAttempt.status !== "in-progress") {
    return { label: t("catalog.review"), href: `/tryout/${pkg.id}`, variant: "secondary" as const };
  }
  if (access.canStart) return { label: t("catalog.start"), href: `/tryout/${pkg.id}`, variant: "default" as const };
  if (access.state === "pending") return { label: t("common.detail"), href: `/tryout/${pkg.id}`, variant: "outline" as const };
  return { label: t("catalog.buy"), href: `/tryout/${pkg.id}`, variant: "default" as const };
}

export function CatalogGrid({
  packages,
  categories,
  accessMap,
}: {
  packages: TryoutPackage[];
  categories: Category[];
  accessMap: Record<string, PackageAccess>;
}) {
  const { t } = useI18n();
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  if (packages.length === 0) {
    return <EmptyCatalog />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => {
        const access = accessMap[pkg.id] ?? { state: "locked", canStart: false, discussionUnlocked: false };
        return (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            category={categoryMap.get(pkg.categoryId)}
            access={access.state}
            href={`/tryout/${pkg.id}`}
            cta={getPackageCta(pkg, access, t)}
          />
        );
      })}
    </div>
  );
}

export function EmptyCatalog({ onReset }: { onReset?: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="items-center justify-center gap-3 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-muted-foreground" />
      </span>
      <div>
        <p className="font-semibold">{t("common.noResults")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("common.noResultsDescription")}</p>
      </div>
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset}>
          {t("common.reset")}
        </Button>
      )}
    </Card>
  );
}

export function CatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="gap-0 overflow-hidden py-0">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
