import type { Locale } from "@/types";

export const LOCALES: Locale[] = ["id", "en"];
export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_STORAGE_KEY = "tryoutku.locale";
export const LOCALE_COOKIE = "tryoutku_locale";

/** WIB / WITA / WIT (+ Pontianak = WIB) → Indonesian by default. */
export const INDONESIAN_TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Pontianak",
  "Asia/Makassar",
  "Asia/Jayapura",
];

export const LOCALE_LABELS: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  id: "ID",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

/** Detect from the device timezone (Asia/Jakarta|Makassar|Jayapura). */
export function detectLocaleFromTimezone(timeZone?: string): Locale | null {
  if (!timeZone) return null;
  return INDONESIAN_TIMEZONES.includes(timeZone) ? "id" : null;
}

/** Detect from `navigator.language` / `navigator.languages`. */
export function detectLocaleFromNavigator(languages?: readonly string[] | string): Locale | null {
  const list = Array.isArray(languages) ? languages : languages ? [languages] : [];
  for (const raw of list) {
    const tag = raw.toLowerCase();
    if (tag.startsWith("id")) return "id";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

/** Runs in the browser: stored choice → timezone → navigator → default. */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fromTz = detectLocaleFromTimezone(timeZone);
  if (fromTz) return fromTz;
  const fromNav = detectLocaleFromNavigator(navigator.languages ?? navigator.language);
  return fromNav ?? DEFAULT_LOCALE;
}

/**
 * Inlined before paint so `<html lang>` and the locale cookie are correct on
 * the very first byte the server sends back after a returning visit.
 */
export const LOCALE_BOOTSTRAP_SCRIPT = `(function(){try{var k='${LOCALE_STORAGE_KEY}';var v=window.localStorage.getItem(k);if(v!=='id'&&v!=='en'){var tz=(Intl.DateTimeFormat().resolvedOptions().timeZone||'');if(['Asia/Jakarta','Asia/Pontianak','Asia/Makassar','Asia/Jayapura'].indexOf(tz)>-1){v='id';}else{var l=(navigator.languages&&navigator.languages[0])||navigator.language||'';v=/^id/i.test(l)?'id':(/^en/i.test(l)?'en':'${DEFAULT_LOCALE}');}try{window.localStorage.setItem(k,v);}catch(e){}}document.documentElement.lang=v;document.cookie='${LOCALE_COOKIE}='+v+';path=/;max-age=31536000;samesite=lax';}catch(e){}})();`;
