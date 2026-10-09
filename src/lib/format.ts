import type { Locale } from "@/types";

const LOCALE_TAG: Record<Locale, string> = { id: "id-ID", en: "en-US" };

/** Rupiah formatter: Rp 149.000 */
export function formatCurrency(value: number, locale: Locale = "id") {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact numbers for stats: 12.4rb (id) / 12.4K (en) */
export function formatCompact(value: number, locale: Locale = "id") {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale = "id", options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(LOCALE_TAG[locale], options).format(value);
}

export function formatDate(value: string | number | Date, locale: Locale = "id", options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], options ?? { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string | number | Date, locale: Locale = "id") {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(value: string | number | Date, locale: Locale = "id") {
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  const diff = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[locale], { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
    ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms || unit === "second") {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return "";
}

export function formatPercent(value: number, locale: Locale = "id", fractionDigits = 0) {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
