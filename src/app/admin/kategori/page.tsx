"use client";

import { useI18n } from "@/lib/i18n";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export default function AdminCategoriesPage() {
  const { t } = useI18n();
  return <TaxonomyManager kind="category" title={t("nav.categories")} subtitle={t("admin.taxonomy.searchPlaceholder")} />;
}
