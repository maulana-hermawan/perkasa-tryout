"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <FileQuestion className="size-6 text-muted-foreground" />
          </span>
          <CardTitle className="text-lg">{t("errors.notFound")}</CardTitle>
          <CardDescription>{t("errors.notFoundDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">{t("errors.backHome")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
