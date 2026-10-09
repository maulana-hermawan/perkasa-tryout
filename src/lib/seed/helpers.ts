import type { I18nText, Question, RichContent } from "@/types";

/* ------------------------------ dates ------------------------------ */

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

export function daysAgo(days: number, at?: Date) {
  return new Date((at?.getTime() ?? Date.now()) - days * DAY).toISOString();
}

export function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

export function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

export function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY).toISOString();
}

export function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * HOUR).toISOString();
}

export function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * MINUTE).toISOString();
}

/* ------------------------------- html ------------------------------ */

/** Inline math — rendered by KaTeX in `<RichContent />`. */
export function m(latex: string) {
  return `<span data-math="inline">${latex}</span>`;
}

/** Display (block) math. */
export function mb(latex: string) {
  return `<span data-math="block">${latex}</span>`;
}

export function p(text: string) {
  return `<p>${text}</p>`;
}

export function ul(items: string[]) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

export function img(src: string, alt: string) {
  return `<img src="${src}" alt="${alt}" />`;
}

/* ----------------------------- content ----------------------------- */

/** Bilingual content helper: `content(id, en?)`. */
export function bi(id: string, en?: string): I18nText {
  return en ? { id, en } : { id };
}

export function rich(id: string, en?: string): RichContent {
  return bi(id, en);
}

/* ---------------------------- questions ---------------------------- */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type QuestionInput = DistributiveOmit<Question, "createdAt" | "updatedAt">;

/**
 * Stable seed timestamps keep the mock backend deterministic between the
 * server render and the first client render.
 */
export function q(input: QuestionInput, createdDaysAgo = 30): Question {
  const createdAt = daysAgo(createdDaysAgo);
  return { ...input, createdAt, updatedAt: createdAt } as Question;
}

export function options(
  entries: { key: string; id: string; en?: string; weight?: number; dimension?: string }[],
) {
  return entries.map((entry) => ({
    id: entry.key,
    content: bi(entry.id, entry.en),
    ...(entry.weight === undefined ? {} : { weight: entry.weight }),
    ...(entry.dimension ? { dimension: entry.dimension } : {}),
  }));
}
