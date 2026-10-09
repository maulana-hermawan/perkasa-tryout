import type {
  Attempt,
  AttemptResult,
  AnswerRecord,
  ConversionTable,
  Difficulty,
  PackageSubtest,
  Question,
  Subtest,
  TestType,
  TryoutPackage,
} from "@/types";
import { dataSource } from "@/lib/repositories";
import { scoreAttempt } from "@/lib/scoring";
import { shuffle, uid } from "@/lib/utils";
import { generateSubtestQuestions, generationSeed } from "./generators";

/**
 * Exam service — everything the exam room and the result screen need.
 *
 * It only talks to `dataSource`, so the flow works identically against the mock
 * backend or a real one.
 */

export interface ExamContext {
  attempt: Attempt;
  pkg: TryoutPackage;
  testType: TestType | null;
  /** Subtests in the order defined by the package. */
  subtests: Subtest[];
  /** subtestId → share of the package duration (subtests without their own timer). */
  shares: Record<string, number>;
  /** subtestId → question ids, in the order shown to the participant. */
  questionOrder: Record<string, string[]>;
  /** Every question used by this attempt, keyed by id. */
  questions: Record<string, Question>;
  conversionTables: ConversionTable[];
}

/* ------------------------------- durations -------------------------------- */

/**
 * Share of the package duration for each subtest that has no timer of its own
 * (TOEFL: the sections share one global clock). Weighted by question count so a
 * 50-item listening section gets more time than a 40-item structure section.
 */
export function subtestShares(pkg: TryoutPackage, subtests: Subtest[]): Record<string, number> {
  const counts = pkg.subtests.map((entry) => {
    const subtest = subtests.find((item) => item.id === entry.subtestId);
    return entry.questionIds.length || subtest?.questionCount || 0;
  });
  const total = counts.reduce((sum, value) => sum + value, 0);
  const shares: Record<string, number> = {};
  pkg.subtests.forEach((entry, position) => {
    shares[entry.subtestId] = total > 0 ? counts[position] / total : 1 / Math.max(1, pkg.subtests.length);
  });
  return shares;
}

export function subtestSeconds(
  subtest: Subtest,
  testType: TestType | null | undefined,
  pkg: TryoutPackage,
  share?: number,
): number {
  if (subtest.durationMinutes && subtest.durationMinutes > 0) return Math.round(subtest.durationMinutes * 60);
  const total = Math.round(pkg.durationMinutes * 60);
  const weight = share && share > 0 ? share : 1 / Math.max(1, pkg.subtests.length);
  return Math.max(60, Math.round(total * weight));
}

export function attemptTotalSeconds(ctx: Pick<ExamContext, "subtests" | "testType" | "pkg" | "shares">): number {
  return ctx.subtests.reduce(
    (sum, subtest) => sum + subtestSeconds(subtest, ctx.testType, ctx.pkg, ctx.shares[subtest.id]),
    0,
  );
}

/* --------------------------- question selection ---------------------------- */

function byDifficultyMix(pool: Question[], mix: Partial<Record<Difficulty, number>> | undefined, count: number): Question[] {
  if (!mix) return pool.slice(0, count);
  const totalWeight = Object.values(mix).reduce((sum, value) => sum + (value ?? 0), 0);
  if (totalWeight <= 0) return pool.slice(0, count);

  const buckets = new Map<Difficulty, Question[]>([
    ["easy", []],
    ["medium", []],
    ["hard", []],
  ]);
  for (const question of pool) buckets.get(question.difficulty)?.push(question);

  const picked: Question[] = [];
  let remaining = count;
  const levels: Difficulty[] = ["easy", "medium", "hard"];

  for (const level of levels) {
    const share = Math.round(((mix[level] ?? 0) / totalWeight) * count);
    const take = Math.min(share, buckets.get(level)?.length ?? 0);
    picked.push(...buckets.get(level)!.slice(0, take));
    remaining -= take;
  }

  if (remaining > 0) {
    const used = new Set(picked.map((question) => question.id));
    picked.push(...pool.filter((question) => !used.has(question.id)).slice(0, remaining));
  }

  return picked;
}

async function resolveQuestions(
  attemptId: string,
  pkg: TryoutPackage,
  subtest: Subtest,
  entry: PackageSubtest,
  rng: () => number,
): Promise<string[]> {
  if (subtest.generator) {
    const seed = generationSeed(attemptId, subtest.id);
    const generated = generateSubtestQuestions(subtest, seed);
    const tagged = generated.map((question) => ({
      ...question,
      tags: [...question.tags, `attempt:${attemptId}`],
    }));
    // Generated items are persisted so grading & review can read them back.
    const stored = await dataSource.questions.bulkCreate(tagged);
    if (!stored.length) return [];
    return stored.map((question) => question.id);
  }

  const { items } = await dataSource.questions.listByFilter({ subtestId: subtest.id, pageSize: 1000 });
  let pool = items;

  const rule = entry.selection;
  if (rule) {
    if (rule.topics?.length) pool = pool.filter((question) => question.topics.some((topic) => rule.topics!.includes(topic)));
    if (rule.tags?.length) pool = pool.filter((question) => question.tags.some((tag) => rule.tags!.includes(tag)));
  }

  if (entry.questionIds.length > 0) {
    const explicit = pool.filter((question) => entry.questionIds.includes(question.id));
    const rest = pool.filter((question) => !entry.questionIds.includes(question.id));
    const wanted = rule?.count ?? entry.questionIds.length;
    // Keep the authored order, then top up from the rest of the pool.
    pool = explicit.length < wanted ? [...explicit, ...rest] : explicit;
  }

  const count = rule?.count ?? (entry.questionIds.length || subtest.questionCount || pool.length);
  const selected = byDifficultyMix(pool, rule?.difficultyMix, Math.min(count, pool.length));

  const ordered = pkg.shuffleQuestions && subtest.shuffleQuestions ? shuffle(selected, rng) : selected;
  return ordered.slice(0, Math.min(count, ordered.length)).map((question) => question.id);
}

/* --------------------------------- start ---------------------------------- */

export interface StartAttemptInput {
  userId: string;
  packageId: string;
  sessionId?: string;
}

export async function startAttempt({ userId, packageId, sessionId }: StartAttemptInput): Promise<Attempt> {
  const pkg = await dataSource.packages.get(packageId);
  if (!pkg) throw new Error(`Package not found: ${packageId}`);

  const allSubtests = await dataSource.subtests.list();
  const testType = await dataSource.testTypes.get(pkg.testTypeId);
  const subtests = pkg.subtests
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => allSubtests.find((subtest) => subtest.id === entry.subtestId))
    .filter((subtest): subtest is Subtest => Boolean(subtest));

  const attemptId = uid("att");
  const shares = subtestShares(pkg, subtests);
  const questionOrder: Record<string, string[]> = {};
  for (const entry of pkg.subtests.slice().sort((a, b) => a.order - b.order)) {
    const subtest = subtests.find((item) => item.id === entry.subtestId);
    if (!subtest) continue;
    questionOrder[subtest.id] = await resolveQuestions(attemptId, pkg, subtest, entry, Math.random);
  }

  const now = new Date().toISOString();
  const attempt: Attempt = {
    id: attemptId,
    userId,
    packageId,
    sessionId,
    status: "in-progress",
    startedAt: now,
    answers: {},
    questionOrder,
    currentSubtestId: subtests[0]?.id,
    currentIndex: 0,
    timeLeftSeconds: subtests.reduce(
      (sum, subtest) => sum + subtestSeconds(subtest, testType, pkg, shares[subtest.id]),
      0,
    ),
    subtestProgress: subtests.map((subtest, index) => ({
      subtestId: subtest.id,
      startedAt: index === 0 ? now : "",
      secondsUsed: 0,
      order: index,
    })),
    tabSwitchCount: 0,
  };

  await dataSource.attempts.create(attempt);
  await dataSource.packages.incrementParticipants(packageId);
  await dataSource.activityLogs.add({
    userId,
    userName: userId,
    action: "attempt.start",
    targetType: "package",
    targetId: packageId,
    message: { id: `Memulai tryout ${pkg.title.id}`, en: `Started tryout ${pkg.title.en ?? pkg.title.id}` },
  });

  return attempt;
}

/* --------------------------------- load ----------------------------------- */

export async function loadExamContext(attemptId: string): Promise<ExamContext | null> {
  const attempt = await dataSource.attempts.get(attemptId);
  if (!attempt) return null;

  const pkg = await dataSource.packages.get(attempt.packageId);
  if (!pkg) return null;

  const allSubtests = await dataSource.subtests.list();
  const testType = await dataSource.testTypes.get(pkg.testTypeId);
  const conversionTables = await dataSource.conversionTables.list();

  const subtests = pkg.subtests
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => allSubtests.find((subtest) => subtest.id === entry.subtestId))
    .filter((subtest): subtest is Subtest => Boolean(subtest));

  const ids = Object.values(attempt.questionOrder).flat();
  const all = await dataSource.questions.list();
  const questions: Record<string, Question> = {};
  for (const question of all) {
    if (ids.includes(question.id)) questions[question.id] = question;
  }

  return {
    attempt,
    pkg,
    testType,
    subtests,
    shares: subtestShares(pkg, subtests),
    questionOrder: attempt.questionOrder,
    questions,
    conversionTables,
  };
}

/* -------------------------------- progress -------------------------------- */

export async function persistProgress(
  attemptId: string,
  patch: Partial<Pick<Attempt, "currentIndex" | "currentSubtestId" | "timeLeftSeconds" | "subtestProgress" | "tabSwitchCount">>,
): Promise<void> {
  await dataSource.attempts.update(attemptId, patch);
}

export async function saveAnswers(attemptId: string, answers: Record<string, AnswerRecord>): Promise<void> {
  if (Object.keys(answers).length === 0) return;
  await dataSource.attempts.saveAnswers(attemptId, answers);
}

/* --------------------------------- submit --------------------------------- */

function standardCounts(tables: ConversionTable[], subtests: Subtest[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const subtest of subtests) {
    const table = tables.find((item) => item.id === subtest.conversionTableId);
    const last = table?.entries.at(-1);
    if (last) map[subtest.id] = last.raw;
  }
  return map;
}

export async function gradeAttempt(attemptId: string, at: string = new Date().toISOString()): Promise<AttemptResult> {
  const ctx = await loadExamContext(attemptId);
  if (!ctx) throw new Error(`Attempt not found: ${attemptId}`);

  const submittedAt = at;
  const secondsPerSubtest: Record<string, number> = {};
  for (const progress of ctx.attempt.subtestProgress) {
    secondsPerSubtest[progress.subtestId] = progress.secondsUsed;
  }

  return scoreAttempt({
    attemptId,
    subtests: ctx.subtests,
    questions: Object.values(ctx.questions),
    questionOrder: ctx.questionOrder,
    answers: ctx.attempt.answers,
    conversionTables: ctx.conversionTables,
    standardCounts: standardCounts(ctx.conversionTables, ctx.subtests),
    secondsPerSubtest,
    startedAt: ctx.attempt.startedAt,
    submittedAt,
    totalParticipants: ctx.pkg.participantCount > 100 ? ctx.pkg.participantCount : 10_000,
  });
}

/**
 * Records a manual score for one essay / short answer and re-grades the attempt.
 *
 * The score is clamped to the question's `maxScore` by the scorer, so the
 * grader can type any number without corrupting the result.
 */
export async function gradeManualAnswer(
  attemptId: string,
  questionId: string,
  score: number,
  note?: string,
): Promise<Attempt> {
  const attempt = await dataSource.attempts.get(attemptId);
  if (!attempt) throw new Error(`Attempt not found: ${attemptId}`);

  const record = attempt.answers[questionId];
  if (!record) throw new Error(`Answer not found: ${questionId}`);

  const answers: Record<string, AnswerRecord> = {
    ...attempt.answers,
    [questionId]: {
      ...record,
      manualScore: score,
      graderNote: note?.trim() || undefined,
      gradedAt: new Date().toISOString(),
    },
  };

  await dataSource.attempts.saveAnswers(attemptId, answers);
  const result = await gradeAttempt(attemptId, attempt.submittedAt ?? new Date().toISOString());
  return dataSource.attempts.submit(attemptId, result);
}

export async function submitAttempt(attemptId: string): Promise<Attempt> {
  const result = await gradeAttempt(attemptId);
  const updated = await dataSource.attempts.submit(attemptId, result);
  await dataSource.activityLogs.add({
    userId: updated.userId,
    userName: updated.userId,
    action: "attempt.submit",
    targetType: "attempt",
    targetId: attemptId,
    message: {
      id: `Menyelesaikan tryout dengan skor ${result.totalScore}/${result.maxScore}`,
      en: `Finished a tryout with a score of ${result.totalScore}/${result.maxScore}`,
    },
  });
  return updated;
}

export async function abandonAttempt(attemptId: string): Promise<Attempt> {
  const attempt = await dataSource.attempts.get(attemptId);
  if (!attempt) throw new Error(`Attempt not found: ${attemptId}`);
  const result = await gradeAttempt(attemptId);
  const updated = await dataSource.attempts.update(attemptId, {
    status: "abandoned",
    submittedAt: result.gradedAt,
    result,
    timeLeftSeconds: 0,
  });
  return updated;
}
