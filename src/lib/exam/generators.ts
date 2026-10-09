import type {
  ComparisonOperator,
  GeneratorConfig,
  KecermatanKarakterQuestion,
  KecermatanVariant,
  KraepelinQuestion,
  NumberComparisonQuestion,
  Question,
  Subtest,
} from "@/types";
import { createRng, hashString, shuffle } from "@/lib/utils";

/**
 * Runtime question generation (Tes Kecermatan).
 *
 * Everything is derived from a seed so the same attempt always regenerates the
 * same items — nothing here may call `Math.random()` directly. Generated items
 * are persisted with the attempt (tagged `generated` + `attempt:<id>`) so the
 * review screen can show them again.
 */

const POOLS: Record<KecermatanVariant, string[]> = {
  number: "0123456789".split(""),
  letter: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  symbol: "!@#$%&*+=?~".split(""),
  mixed: "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ!@#$%&*+=?~".split(""),
};

/** Bilingual content labels for generated items (content, not UI chrome). */
const PROMPT = {
  karakter: { id: "Karakter apa yang hilang?", en: "Which character is missing?" },
  kraepelin: {
    id: "Jumlahkan dua angka berdekatan, lalu isi digit terakhirnya.",
    en: "Add two adjacent numbers, then fill in the last digit of the sum.",
  },
  perbandingan: { id: "Pilih tanda yang tepat.", en: "Pick the correct sign." },
};

function baseQuestion(
  subtest: Subtest,
  id: string,
  prompt: { id: string; en?: string },
  createdAt: string,
) {
  return {
    id,
    testTypeId: subtest.testTypeId,
    subtestId: subtest.id,
    prompt,
    difficulty: "medium" as const,
    topics: ["generated"],
    tags: ["generated"],
    createdAt,
    updatedAt: createdAt,
  };
}

/* --------------------------- kecermatan karakter --------------------------- */

function generateKarakter(subtest: Subtest, config: Extract<GeneratorConfig, { kind: "kecermatan-karakter" }>, seed: string, now: string): Question[] {
  const rng = createRng(`${seed}:karakter`);
  const pool = POOLS[config.variant];
  const items: KecermatanKarakterQuestion[] = [];

  for (let column = 0; column < config.columns; column++) {
    // One key row per column: it is memorized, then hidden while answering.
    const columnRng = createRng(`${seed}:karakter:${column}`);
    const keyRow = shuffle(pool, columnRng).slice(0, 5);
    for (let index = 0; index < config.itemsPerColumn; index++) {
      const correctIndex = Math.floor(rng() * keyRow.length) % keyRow.length;
      const shown = shuffle(
        keyRow.filter((_, position) => position !== correctIndex),
        rng,
      );
      items.push({
        ...baseQuestion(subtest, `${seed}-k-${column}-${index}`, PROMPT.karakter, now),
        type: "kecermatan-karakter",
        variant: config.variant,
        column,
        indexInColumn: index,
        keyRow,
        shown,
        correctIndex,
      });
    }
  }

  return items;
}

/* ------------------------------ kraepelin --------------------------------- */

function generateKraepelin(subtest: Subtest, config: Extract<GeneratorConfig, { kind: "kecermatan-kraepelin" }>, seed: string, now: string): Question[] {
  const rng = createRng(`${seed}:kraepelin`);
  const span = config.maxDigit - config.minDigit + 1;
  const items: KraepelinQuestion[] = [];

  for (let column = 0; column < config.columns; column++) {
    const rows = Array.from({ length: config.rowsPerColumn }, () => config.minDigit + Math.floor(rng() * span));
    const correctAnswers = rows.slice(0, -1).map((value, index) => ((value + rows[index + 1]) % 10).toString());
    items.push({
      ...baseQuestion(subtest, `${seed}-p-${column}`, PROMPT.kraepelin, now),
      type: "kecermatan-kraepelin",
      column,
      rows,
      correctAnswers,
    });
  }

  return items;
}

/* ---------------------------- perbandingan -------------------------------- */

function comparisonOperand(rng: () => number, maxValue: number, withExpression: boolean): { text: string; value: number } {
  if (!withExpression || rng() < 0.45) {
    const value = 1 + Math.floor(rng() * maxValue);
    return { text: String(value), value };
  }
  const a = 1 + Math.floor(rng() * Math.max(1, Math.floor(maxValue / 2)));
  const b = 1 + Math.floor(rng() * Math.max(1, Math.floor(maxValue / 2)));
  const add = rng() < 0.6;
  const value = add ? a + b : a - b;
  return { text: add ? `${a} + ${b}` : `${a} − ${b}`, value };
}

function generatePerbandingan(
  subtest: Subtest,
  config: Extract<GeneratorConfig, { kind: "kecermatan-perbandingan" }>,
  seed: string,
  now: string,
): Question[] {
  const rng = createRng(`${seed}:perbandingan`);
  const items: NumberComparisonQuestion[] = [];

  for (let column = 0; column < config.columns; column++) {
    for (let index = 0; index < config.itemsPerColumn; index++) {
      const left = comparisonOperand(rng, config.maxValue, config.withExpression);
      // ~20% of the items are deliberately equal so "=" stays meaningful.
      const right = rng() < 0.2 ? { text: String(left.value), value: left.value } : comparisonOperand(rng, config.maxValue, config.withExpression);
      const correct: ComparisonOperator = left.value < right.value ? "<" : left.value > right.value ? ">" : "=";
      items.push({
        ...baseQuestion(subtest, `${seed}-c-${column}-${index}`, PROMPT.perbandingan, now),
        type: "kecermatan-perbandingan",
        left: left.text,
        right: right.text,
        correct,
      });
    }
  }

  return items;
}

/* --------------------------------- entry ---------------------------------- */

/** Stable seed for a subtest inside one attempt. */
export function generationSeed(attemptId: string, subtestId: string) {
  return `gen-${hashString(`${attemptId}:${subtestId}`).toString(36)}`;
}

export function generateSubtestQuestions(subtest: Subtest, seed: string, now = new Date().toISOString()): Question[] {
  const config = subtest.generator;
  if (!config) return [];

  switch (config.kind) {
    case "kecermatan-karakter":
      return generateKarakter(subtest, config, seed, now);
    case "kecermatan-kraepelin":
      return generateKraepelin(subtest, config, seed, now);
    case "kecermatan-perbandingan":
      return generatePerbandingan(subtest, config, seed, now);
    default:
      return [];
  }
}

/** How many items sit in one column (kraepelin columns are one "item"). */
export function columnItemCount(subtest: Subtest): number {
  const config = subtest.generator;
  if (!config) return 1;
  if (config.kind === "kecermatan-kraepelin") return 1;
  return config.itemsPerColumn;
}

export function columnSeconds(subtest: Subtest): number | null {
  return subtest.generator?.secondsPerColumn ?? null;
}

/** Number of columns in a generated subtest. */
export function columnCount(subtest: Subtest): number {
  return subtest.generator?.columns ?? 0;
}
