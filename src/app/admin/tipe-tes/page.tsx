"use client";

import { useI18n } from "@/lib/i18n";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export default function AdminTestTypesPage() {
  const { t } = useI18n();
  return <TaxonomyManager kind="testType" title={t("nav.testTypes")} subtitle={t("admin.taxonomy.searchPlaceholder")} />;
}
