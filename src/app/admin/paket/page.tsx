"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatCompact, formatCurrency } from "@/lib/format";
import { dataSource } from "@/lib/repositories";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { AdminEmpty, AdminPageHeader, AdminRow, AdminToolbar } from "@/components/admin/admin-page";
import { DynamicIcon } from "@/components/common/dynamic-icon";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminPackagesPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const packages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.packages
      .filter((pkg) => {
        if (!query) return true;
        return `${pkg.title.id} ${pkg.title.en ?? ""} ${pkg.slug} ${pkg.tags.join(" ")}`.toLowerCase().includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [db.packages, search]);

  if (!hydrated) return <PageLoader />;

  async function togglePublish(id: string, published: boolean) {
    setBusyId(id);
    try {
      await dataSource.packages.update(id, { status: published ? "archived" : "published" });
      toast.success(published ? t("admin.packages.unpublishToast") : t("admin.packages.publishToast"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("admin.packages.title")} subtitle={t("admin.packages.subtitle")} count={packages.length} />

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("admin.packages.searchPlaceholder")}
      />

      {packages.length === 0 ? (
        <AdminEmpty title={t("admin.packages.empty")} />
      ) : (
        <ul className="space-y-2.5">
          {packages.map((pkg) => {
            const category = db.categories.find((item) => item.id === pkg.categoryId);
            const published = pkg.status === "published";
            return (
              <AdminRow key={pkg.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${
                        pkg.thumbnail.kind === "gradient" ? pkg.thumbnail.from : "#4f46e5"
                      }, ${pkg.thumbnail.kind === "gradient" ? pkg.thumbnail.to : "#7c3aed"})`,
                    }}
                  >
                    <DynamicIcon
                      name={pkg.thumbnail.kind === "gradient" ? pkg.thumbnail.icon : undefined}
                      className="size-5"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{tx(pkg.title)}</p>
                      <Badge variant={published ? "success" : "muted"}>
                        {published ? t("admin.packages.published") : t("admin.packages.archived")}
                      </Badge>
                      <Badge variant={pkg.pricingModel === "free" ? "success" : pkg.pricingModel === "freemium" ? "warning" : "default"}>
                        {t(`pricing.${pkg.pricingModel}`)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {category ? tx(category.name) : "-"} · {t("admin.packages.questions")}: {pkg.totalQuestions} ·{" "}
                      {t("admin.packages.participants")}: {formatCompact(pkg.participantCount, locale)}
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      {pkg.subtests.length} subtes · {pkg.durationMinutes} {t("common.minutes")} ·{" "}
                      {pkg.showDiscussion ? t("package.includesDiscussion") : t("admin.questions.generated")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">
                      {pkg.pricingModel === "free"
                        ? t("common.free")
                        : formatCurrency(pkg.discountPrice ?? pkg.price, locale)}
                    </p>
                    {pkg.discountPrice && (
                      <p className="text-[0.6875rem] text-muted-foreground line-through">
                        {formatCurrency(pkg.price, locale)}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
                      <Link href={`/tryout/${pkg.id}`}>
                        <Eye className="size-4" />
                        {t("common.detail")}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      disabled={busyId === pkg.id}
                      onClick={() => togglePublish(pkg.id, published)}
                    >
                      {busyId === pkg.id ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
                      {published ? t("admin.packages.unpublish") : t("admin.packages.publish")}
                    </Button>
                  </div>
                </div>
              </AdminRow>
            );
          })}
        </ul>
      )}
    </div>
  );
}
