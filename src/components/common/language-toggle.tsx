"use client";

import { Languages } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT_LABELS } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { t, locale, setLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon-sm" aria-label={t("language.toggle")} title={t("language.toggle")}>
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item}
            onClick={() => setLocale(item)}
            className="gap-2"
            aria-current={locale === item}
          >
            <span className="w-6 text-xs font-semibold text-muted-foreground">{LOCALE_SHORT_LABELS[item]}</span>
            {LOCALE_LABELS[item]}
            {locale === item && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageToggle;
