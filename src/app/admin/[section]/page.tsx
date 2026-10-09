"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Construction, LayoutDashboard } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { findAdminSection } from "@/components/layout/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Sections that are not implemented yet render an honest, localized
 * "in progress" panel instead of a broken page.
 */
export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const { t } = useI18n();
  const item = findAdminSection(params.section);

  if (!item) notFound();

  return (
    <Card className="mx-auto max-w-lg text-center">
      <CardHeader className="items-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Construction className="size-6 text-muted-foreground" />
        </span>
        <CardTitle>{t(item.labelKey)}</CardTitle>
        <CardDescription>{t("common.comingSoonDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t("admin.greetingSubtitle")}</p>
        <Button asChild variant="outline">
          <Link href="/admin">
            <LayoutDashboard className="size-4" />
            {t("nav.dashboard")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
