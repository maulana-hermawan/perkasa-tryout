import { cookies } from "next/headers";
import type { Locale } from "@/types";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

/** Locale for the very first server render (cookie set by the bootstrap script). */
export async function getServerLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value;
    if (isLocale(value)) return value;
  } catch {
    /* cookies unavailable (e.g. static export) */
  }
  return DEFAULT_LOCALE;
}
