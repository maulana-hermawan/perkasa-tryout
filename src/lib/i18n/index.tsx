"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { I18nText, Locale } from "@/types";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  detectLocale,
  isLocale,
} from "./config";
import id from "./dictionaries/id.json";
import en from "./dictionaries/en.json";

export * from "./config";

/**
 * The Indonesian dictionary is the source of truth for key names: every other
 * dictionary must mirror it exactly (checked by the `typecheck` script).
 */
export type Dictionary = typeof id;

const dictionaries: Record<Locale, Dictionary> = { id, en: en as Dictionary };

/* --------------------------- key paths ---------------------------- */

type Prev = [never, 0, 1, 2, 3, 4, 5, 6];

type Join<K, P> = K extends string
  ? P extends string
    ? P extends ""
      ? K
      : `${P}.${K}`
    : never
  : never;

type Leaves<T, D extends number = 6> = [D] extends [never]
  ? never
  : T extends string
    ? ""
    : { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T];

export type TranslationKey = Leaves<Dictionary>;

/* --------------------------- translate ---------------------------- */

function lookup(source: unknown, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>((acc, part) => (acc == null ? undefined : (acc as Record<string, unknown>)[part]), source);
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function translate(
  locale: Locale,
  key: TranslationKey | string,
  vars?: Record<string, string | number>,
): string {
  const value = lookup(dictionaries[locale], key) ?? lookup(dictionaries[DEFAULT_LOCALE], key);
  return value ? interpolate(value, vars) : key;
}

/* ---------------------------- context ----------------------------- */

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey | string, vars?: Record<string, string | number>) => string;
  /** Resolve a localized content field (`{ id, en }`) with fallback. */
  tx: (value?: I18nText) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [ready, setReady] = useState(false);

  // The server can only guess (cookie or default). Once hydrated we settle on
  // the stored choice / detected locale — this runs in an effect so React never
  // sees a hydration mismatch.
  useEffect(() => {
    const detected = detectLocale();
    // Syncing with an external system (localStorage / Intl) after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(detected);
    document.documentElement.lang = detected;
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    document.documentElement.lang = next;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
    return {
      locale,
      setLocale,
      ready,
      t: (key, vars) => {
        const found = lookup(dictionary, key) ?? lookup(dictionaries[DEFAULT_LOCALE], key);
        return found ? interpolate(found, vars) : key;
      },
      tx: (content) => (content ? (locale === "en" ? (content.en ?? content.id) : content.id) : ""),
    };
  }, [locale, ready, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}

export function useLocale() {
  return useI18n().locale;
}
