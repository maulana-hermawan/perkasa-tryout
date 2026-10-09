"use client";

import { useI18n } from "@/lib/i18n";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export default function AdminSubtestsPage() {
  const { t } = useI18n();
  return <TaxonomyManager kind="subtest" title={t("nav.subtests")} subtitle={t("admin.taxonomy.searchPlaceholder")} />;
}
