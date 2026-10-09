"use client";

import { Search, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { Category, PricingModel } from "@/types";
import { DynamicIcon } from "@/components/common/dynamic-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SortKey = "newest" | "popular" | "price-asc" | "price-desc" | "title";

export const PRICING_MODELS: PricingModel[] = ["free", "freemium", "paid"];

export function CatalogFilters({
  search,
  onSearchChange,
  categories,
  activeCategory,
  onCategoryChange,
  activePricing,
  onPricingChange,
  sort,
  onSortChange,
  resultCount,
  showCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  activePricing: PricingModel | null;
  onPricingChange: (value: PricingModel | null) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  resultCount: number;
  showCount?: boolean;
}) {
  const { t, tx } = useI18n();
  const hasFilters = Boolean(search) || Boolean(activeCategory) || Boolean(activePricing);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            aria-label={t("common.search")}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortKey)}>
          <SelectTrigger className="w-[9.5rem]" aria-label={t("catalog.sortLabel")}>
            <span className="truncate">{t(`catalog.sort${SORT_LABEL[sort]}`)}</span>
          </SelectTrigger>
          <SelectContent align="end">
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {t(`catalog.sort${SORT_LABEL[key]}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category chips — horizontally scrollable, thumb friendly */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        <Chip
          active={activeCategory === null}
          onClick={() => onCategoryChange(null)}
          label={t("catalog.filterAllCategories")}
        />
        {categories.map((category) => (
          <Chip
            key={category.id}
            active={activeCategory === category.id}
            onClick={() => onCategoryChange(activeCategory === category.id ? null : category.id)}
            label={tx(category.name)}
            icon={category.icon}
          />
        ))}
      </div>

      {/* Pricing model chips */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        {PRICING_MODELS.map((model) => (
          <Chip
            key={model}
            active={activePricing === model}
            onClick={() => onPricingChange(activePricing === model ? null : model)}
            label={t(`pricing.${model}`)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{showCount ? t("common.resultsFound", { count: resultCount }) : null}</span>
        {hasFilters && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              onSearchChange("");
              onCategoryChange(null);
              onPricingChange(null);
            }}
          >
            <X className="size-3.5" />
            {t("common.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}

const SORT_LABEL: Record<SortKey, string> = {
  newest: "Newest",
  popular: "Popular",
  "price-asc": "PriceAsc",
  "price-desc": "PriceDesc",
  title: "Title",
};

function Chip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon && <DynamicIcon name={icon} className="size-3.5" />}
      {label}
    </button>
  );
}

export { Badge };
