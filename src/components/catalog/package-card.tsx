"use client";

import Link from "next/link";
import { Clock, HelpCircle, Star, Users } from "lucide-react";
import { DynamicIcon } from "@/components/common/dynamic-icon";

import { useI18n } from "@/lib/i18n";
import { formatCompact, formatCurrency, formatNumber } from "@/lib/format";
import type { AccessState } from "@/lib/hooks/use-package-access";
import type { Category, TryoutPackage } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const PRICING_BADGE: Record<TryoutPackage["pricingModel"], "success" | "warning" | "default"> = {
  free: "success",
  freemium: "warning",
  paid: "default",
};

export function PackageThumbnail({
  thumbnail,
  className,
}: {
  thumbnail: TryoutPackage["thumbnail"];
  className?: string;
}) {
  if (thumbnail.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbnail.url} alt="" className={cn("size-full object-cover", className)} />
    );
  }
  return (
    <div
      className={cn("flex size-full items-center justify-center", className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${thumbnail.from}, ${thumbnail.to})` }}
      aria-hidden
    />
  );
}

export function PackageCard({
  pkg,
  category,
  access,
  href,
  cta,
}: {
  pkg: TryoutPackage;
  category?: Category;
  access: AccessState;
  href: string;
  cta: { label: string; href: string; variant?: "default" | "outline" | "secondary" };
}) {
  const { t, tx, locale } = useI18n();

  return (
    <Card className="group overflow-hidden gap-0 py-0 transition-shadow hover:shadow-md">
      <Link href={href} className="relative block aspect-[16/9] w-full overflow-hidden">
        <PackageThumbnail thumbnail={pkg.thumbnail} />
        <span className="absolute inset-0 flex items-center justify-center text-white/90">
          <DynamicIcon
            name={pkg.thumbnail.kind === "gradient" ? pkg.thumbnail.icon : undefined}
            className="size-12 opacity-90"
          />
        </span>
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <Badge variant={PRICING_BADGE[pkg.pricingModel]}>{t(`pricing.${pkg.pricingModel}Short`)}</Badge>
          {category && (
            <Badge variant="secondary" className="bg-white/85 text-foreground backdrop-blur-sm">
              {tx(category.name)}
            </Badge>
          )}
        </div>
        {pkg.rating > 0 && (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {pkg.rating.toFixed(1)}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={href} className="line-clamp-2 text-sm leading-snug font-semibold hover:text-primary">
          {tx(pkg.title)}
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HelpCircle className="size-3.5" />
            {t("catalog.cardQuestions", { count: pkg.totalQuestions })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {t("catalog.cardMinutes", { count: pkg.durationMinutes })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {formatCompact(pkg.participantCount, locale)}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            {pkg.pricingModel === "free" ? (
              <span className="text-base font-bold text-success">{t("common.free")}</span>
            ) : (
              <div className="flex flex-col">
                {pkg.discountPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(pkg.price, locale)}
                  </span>
                )}
                <span className="text-base font-bold">
                  {formatCurrency(pkg.discountPrice ?? pkg.price, locale)}
                </span>
              </div>
            )}
            <p className="text-[0.6875rem] text-muted-foreground">
              {t("catalog.cardParticipants", { count: formatNumber(pkg.participantCount, locale) })}
            </p>
          </div>

          <Button asChild size="sm" variant={cta.variant ?? "default"} className="min-w-[5.5rem]">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        </div>

        {access === "pending" && (
          <p className="rounded-md bg-warning/15 px-2 py-1 text-[0.6875rem] font-medium text-warning-foreground">
            {t("catalog.waitingPayment")}
          </p>
        )}
        {access === "rejected" && (
          <p className="rounded-md bg-destructive/10 px-2 py-1 text-[0.6875rem] font-medium text-destructive">
            {t("catalog.rejectedPayment")}
          </p>
        )}
        {access === "freemium-locked" && (
          <p className="text-[0.6875rem] text-muted-foreground">{t("pricing.freemiumDescription")}</p>
        )}
      </div>
    </Card>
  );
}

export default PackageCard;
