"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { useDbHydrated, useDatabase } from "@/lib/store/db";
import { usePackageAccessMap } from "@/lib/hooks/use-package-access";
import type { PricingModel, TryoutPackage } from "@/types";
import { CatalogFilters, PRICING_MODELS, type SortKey } from "@/components/catalog/catalog-filters";
import { CatalogGrid, CatalogSkeleton, EmptyCatalog } from "@/components/catalog/catalog-grid";

function sortPackages(items: TryoutPackage[], sort: SortKey) {
  const copy = [...items];
  switch (sort) {
    case "popular":
      return copy.sort((a, b) => b.participantCount - a.participantCount);
    case "price-asc":
      return copy.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    case "price-desc":
      return copy.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    case "title":
      return copy.sort((a, b) => a.title.id.localeCompare(b.title.id));
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime(),
      );
  }
}

export default function CatalogPage() {
  const { t } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const accessMap = usePackageAccessMap();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingModel | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");

  const categories = useMemo(() => {
    const published = db.packages.filter((pkg) => pkg.status === "published");
    return db.categories
      .filter((item) => published.some((pkg) => pkg.categoryId === item.id))
      .sort((a, b) => a.order - b.order);
  }, [db]);

  const packages = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = db.packages.filter((pkg) => {
      if (pkg.status !== "published") return false;
      if (category && pkg.categoryId !== category) return false;
      if (pricing && pkg.pricingModel !== pricing) return false;
      if (query) {
        const haystack = `${pkg.title.id} ${pkg.title.en ?? ""} ${pkg.description.id} ${pkg.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    return sortPackages(filtered, sort);
  }, [db, search, category, pricing, sort]);

  const resetFilters = () => {
    setSearch("");
    setCategory(null);
    setPricing(null);
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("catalog.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("catalog.subtitle")}</p>
      </div>

      {!hydrated ? (
        <div className="space-y-3">
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
          <CatalogSkeleton />
        </div>
      ) : (
        <>
          <CatalogFilters
            search={search}
            onSearchChange={setSearch}
            categories={categories}
            activeCategory={category}
            onCategoryChange={setCategory}
            activePricing={pricing}
            onPricingChange={setPricing}
            sort={sort}
            onSortChange={setSort}
            resultCount={packages.length}
            showCount
          />

          {packages.length === 0 ? (
            <EmptyCatalog onReset={resetFilters} />
          ) : (
            <CatalogGrid packages={packages} categories={db.categories} accessMap={accessMap} />
          )}

          <p className="pt-2 text-center text-xs text-muted-foreground">
            {t("common.resultsFound", { count: packages.length })} · {PRICING_MODELS.length} {t("catalog.filterPricing")}
          </p>
        </>
      )}
    </section>
  );
}
