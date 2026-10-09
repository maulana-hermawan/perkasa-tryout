import {
  isAnswered,
  type AnswerRecord,
  type AttemptResult,
  type ConversionTable,
  type DimensionScore,
  type Question,
  type Subtest,
  type SubtestResult,
} from "@/types";
import { hashString } from "@/lib/utils";
import { scoreQuestion } from "./scorers";

export * from "./scorers";

/* --------------------------- conversion tables ---------------------------- */

/**
 * TOEFL conversion tables are defined for the full-length section
 * (e.g. 50 listening items). A mini package with 3 items must first be
 * projected onto the full length before looking the raw score up.
 */
export function projectRaw(raw: number, actualCount: number, standardCount: number) {
  if (actualCount <= 0 || standardCount <= 0) return raw;
  return Math.round((raw / actualCount) * standardCount);
}

export function convertRaw(table: ConversionTable | undefined, raw: number) {
  if (!table || table.entries.length === 0) return undefined;
  let scaled = table.entries[0].scaled;
  for (const entry of table.entries) {
    if (raw >= entry.raw) scaled = entry.scaled;
  }
  return scaled;
}

export function applyConversion(
  table: ConversionTable | undefined,
  raw: number,
  actualCount: number,
  standardCount: number,
) {
  if (!table) return undefined;
  return convertRaw(table, projectRaw(raw, actualCount, standardCount));
}

/**
 * Passing grades are authored for the standard (full) question count, so a
 * package that uses fewer questions gets a proportional passing grade.
 */
export function effectivePassingGrade(subtest: Subtest, questionCount: number) {
  if (subtest.passingGrade === null || subtest.passingGrade === undefined) return null;
  const standard = subtest.questionCount > 0 ? subtest.questionCount : questionCount;
  if (standard <= 0) return subtest.passingGrade;
  return Math.round((subtest.passingGrade * questionCount) / standard);
}

/* ------------------------------ subtest score ----------------------------- */

export interface SubtestScoreInput {
  subtest: Subtest;
  questions: Question[];
  answers: Record<string, AnswerRecord>;
  secondsUsed?: number;
  conversionTable?: ConversionTable;
  /** Standard (full) length of the section, for conversion projection. */
  standardCount?: number;
}

export function scoreSubtest({
  subtest,
  questions,
  answers,
  secondsUsed = 0,
  conversionTable,
  standardCount,
}: SubtestScoreInput): SubtestResult {
  let rawScore = 0;
  let maxScore = 0;
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  for (const question of questions) {
    const record = answers[question.id];
    const value = record?.value ?? null;
    const result = scoreQuestion(question, value, subtest.scoring);

    // A manually graded answer wins over the automatic keyword score.
    if (record?.manualScore !== undefined) {
      rawScore += Math.max(0, Math.min(record.manualScore, result.maxPoints));
      maxScore += result.maxPoints;
      if (!isAnswered(value)) empty += 1;
      else if (record.manualScore > 0) correct += 1;
      else wrong += 1;
      continue;
    }

    rawScore += result.points;
    maxScore += result.maxPoints;
    if (!isAnswered(value) && result.correct === null) empty += 1;
    else if (result.correct === true) correct += 1;
    else if (result.correct === false) wrong += 1;
    else empty += 1;
  }

  const passingGrade = effectivePassingGrade(subtest, questions.length);
  const scaledScore = applyConversion(
    conversionTable,
    rawScore,
    questions.length,
    standardCount ?? subtest.questionCount,
  );

  return {
    subtestId: subtest.id,
    name: subtest.name,
    rawScore: round2(rawScore),
    maxScore: round2(maxScore),
    scaledScore,
    correct,
    wrong,
    empty,
    passingGrade,
    passed: passingGrade === null ? null : round2(rawScore) >= passingGrade,
    secondsUsed,
  };
}

/* ----------------------------- attempt scoring ---------------------------- */

export interface AttemptScoreInput {
  attemptId: string;
  subtests: Subtest[];
  questions: Question[];
  /** subtestId → question ids, in the order shown to the participant. */
  questionOrder: Record<string, string[]>;
  answers: Record<string, AnswerRecord>;
  conversionTables: ConversionTable[];
  /** Standard (full) length per subtest, defaults to `subtest.questionCount`. */
  standardCounts?: Record<string, number>;
  secondsPerSubtest?: Record<string, number>;
  startedAt: string;
  submittedAt: string;
  /** Mock national ranking pool size. */
  totalParticipants?: number;
}

export function aggregateDimensions(
  subtests: Subtest[],
  questions: Question[],
  answers: Record<string, AnswerRecord>,
): DimensionScore[] {
  const buckets = new Map<string, { raw: number; max: number; label: DimensionScore["label"]; score: number }>();

  for (const subtest of subtests) {
    for (const dimension of subtest.dimensions ?? []) {
      if (!buckets.has(dimension.key)) {
        buckets.set(dimension.key, { raw: 0, max: 0, label: dimension.label, score: 0 });
      }
    }
  }

  for (const question of questions) {
    if (question.type !== "likert" || !question.dimension) continue;
    const bucket = buckets.get(question.dimension);
    if (!bucket) continue;
    const result = scoreQuestion(question, answers[question.id]?.value ?? null, { correct: 1, wrong: 0, empty: 0 });
    bucket.raw += result.points;
    bucket.max += result.maxPoints;
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => ({
    dimension: key,
    label: bucket.label,
    raw: round2(bucket.raw),
    max: bucket.max,
    score: bucket.max > 0 ? Math.round((bucket.raw / bucket.max) * 100) : 0,
  }));
}

export function scoreAttempt({
  attemptId,
  subtests,
  questions,
  questionOrder,
  answers,
  conversionTables,
  standardCounts,
  secondsPerSubtest,
  startedAt,
  submittedAt,
  totalParticipants = 10_000,
}: AttemptScoreInput): AttemptResult {
  const byId = new Map(questions.map((question) => [question.id, question]));

  const perSubtest: SubtestResult[] = subtests.map((subtest) => {
    const ids = questionOrder[subtest.id] ?? [];
    const ordered = ids.map((id) => byId.get(id)).filter((item): item is Question => Boolean(item));
    return scoreSubtest({
      subtest,
      questions: ordered,
      answers,
      secondsUsed: secondsPerSubtest?.[subtest.id] ?? 0,
      conversionTable: conversionTables.find((table) => table.id === subtest.conversionTableId),
      standardCount: standardCounts?.[subtest.id],
    });
  });

  const totalScore = round2(perSubtest.reduce((sum, item) => sum + item.rawScore, 0));
  const maxScore = round2(perSubtest.reduce((sum, item) => sum + item.maxScore, 0));
  const correct = perSubtest.reduce((sum, item) => sum + item.correct, 0);
  const wrong = perSubtest.reduce((sum, item) => sum + item.wrong, 0);
  const empty = perSubtest.reduce((sum, item) => sum + item.empty, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const scaledSections = perSubtest.filter((item) => typeof item.scaledScore === "number");
  const scaledScore =
    scaledSections.length === perSubtest.length && perSubtest.length > 0
      ? Math.round((scaledSections.reduce((sum, item) => sum + (item.scaledScore ?? 0), 0) * 10) / 3)
      : undefined;

  const grades = perSubtest.filter((item) => item.passingGrade !== null);
  const passed = grades.length === 0 ? null : grades.every((item) => item.passed === true);

  // Deterministic mock ranking derived from the attempt id + score.
  const jitter = (hashString(attemptId) % 7) - 3;
  const percentile = Math.min(99, Math.max(1, Math.round(percentage * 0.9) + jitter));
  const rank = Math.max(1, Math.round(totalParticipants * (1 - percentile / 100)) + 1);

  // Essays need a human score before the result is final.
  let manualPending = false;
  let manualDone = false;
  for (const item of perSubtest) {
    for (const id of questionOrder[item.subtestId] ?? []) {
      const question = byId.get(id);
      if (question?.type !== "essay") continue;
      if (answers[id]?.manualScore !== undefined) manualDone = true;
      else if (isAnswered(answers[id]?.value)) manualPending = true;
    }
  }

  return {
    totalScore,
    maxScore,
    scaledScore,
    percentage,
    correct,
    wrong,
    empty,
    rank,
    totalParticipants,
    percentile,
    passed,
    perSubtest,
    dimensions: aggregateDimensions(subtests, questions, answers),
    durationSeconds: Math.max(0, Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000)),
    gradedAt: submittedAt,
    status: manualPending ? "awaiting-manual" : manualDone ? "graded" : "auto",
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
