import { beforeAll, describe, expect, it } from "vitest";
import type { AnswerRecord, AnswerValue, Question } from "@/types";
import { useDbStore } from "@/lib/store/db";
import { dataSource } from "@/lib/repositories";
import { generateSubtestQuestions, generationSeed } from "./generators";
import { gradeAttempt, loadExamContext, startAttempt, subtestSeconds, subtestShares, submitAttempt } from "./service";

/** A plausible answer for the objective question types we can synthesize. */
function sampleAnswer(question: Question): AnswerValue | null {
  switch (question.type) {
    case "multiple-choice":
    case "image-choice":
      return { kind: "choice", optionId: question.correctOptionId };
    case "multiple-answer":
      return { kind: "choices", optionIds: question.correctOptionIds };
    case "true-false":
      return { kind: "boolean", value: question.correct };
    case "weighted-choice":
      return { kind: "choice", optionId: question.targetOptionId ?? question.options[0].id };
    case "likert":
      return { kind: "scale", value: question.max };
    case "listening":
      return sampleAnswer(question.inner);
    case "kecermatan-karakter":
      return { kind: "choice", optionId: String(question.correctIndex) };
    case "kecermatan-perbandingan":
      return { kind: "comparison", value: question.correct };
    case "kecermatan-kraepelin":
      return { kind: "digits", digits: question.correctAnswers };
    default:
      return null;
  }
}

beforeAll(() => {
  useDbStore.getState().reset();
});

describe("exam service", () => {
  it("starts an attempt with a question order for every subtest", async () => {
    const attempt = await startAttempt({ userId: "usr-participant", packageId: "pkg-skd-a" });
    expect(attempt.status).toBe("in-progress");
    expect(Object.keys(attempt.questionOrder)).toEqual(["st-twk", "st-tiu", "st-tkp"]);
    expect(attempt.currentSubtestId).toBe("st-twk");
    expect(attempt.subtestProgress).toHaveLength(3);
    expect(attempt.timeLeftSeconds).toBeGreaterThan(0);

    // Only the first subtest is started — the others wait for their intro.
    expect(attempt.subtestProgress[0].startedAt).not.toBe("");
    expect(attempt.subtestProgress[1].startedAt).toBe("");
  });

  it("loads the context with every question resolvable", async () => {
    const attempt = await startAttempt({ userId: "usr-participant-2", packageId: "pkg-skd-a" });
    const ctx = await loadExamContext(attempt.id);
    expect(ctx).not.toBeNull();
    const ids = Object.values(ctx!.questionOrder).flat();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(ctx!.questions[id]).toBeDefined();
  });

  it("generates kecermatan items deterministically per attempt", async () => {
    const seed = generationSeed("att-test", "st-kecermatan-karakter");
    const subtests = await dataSource.subtests.list();
    const subtest = subtests.find((item) => item.id === "st-kecermatan-karakter")!;

    const first = generateSubtestQuestions(subtest, seed, "2026-01-01T00:00:00.000Z");
    const second = generateSubtestQuestions(subtest, seed, "2026-01-01T00:00:00.000Z");
    expect(first).toHaveLength(8 * 8); // columns × itemsPerColumn
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));

    const karakter = first[0];
    expect(karakter.type).toBe("kecermatan-karakter");
    if (karakter.type === "kecermatan-karakter") {
      expect(karakter.keyRow).toHaveLength(5);
      expect(karakter.shown).toHaveLength(4);
      expect(karakter.shown).not.toContain(karakter.keyRow[karakter.correctIndex]);
    }
  });

  it("persists generated questions so grading can read them back", async () => {
    const attempt = await startAttempt({ userId: "usr-participant-3", packageId: "pkg-kecermatan" });
    const ids = attempt.questionOrder["st-kecermatan-perbandingan"] ?? [];
    expect(ids).toHaveLength(6 * 20); // columns × itemsPerColumn

    const stored = await Promise.all(ids.slice(0, 5).map((id) => dataSource.questions.get(id)));
    for (const question of stored) {
      expect(question).not.toBeNull();
      expect(question!.tags).toContain(`attempt:${attempt.id}`);
    }
  });

  it("starts every published package with a non-empty question order", async () => {
    const packages = await dataSource.packages.listPublished();
    expect(packages.length).toBeGreaterThan(0);
    for (const pkg of packages) {
      const attempt = await startAttempt({ userId: "usr-participant", packageId: pkg.id });
      expect(attempt.status).toBe("in-progress");
      for (const [subtestId, ids] of Object.entries(attempt.questionOrder)) {
        expect(ids.length, `${pkg.id}/${subtestId}`).toBeGreaterThan(0);
      }
    }
  });

  it("shares the package duration between subtests that have no own timer", async () => {
    const subtests = await dataSource.subtests.list();
    const pkg = (await dataSource.packages.get("pkg-toefl-mini"))!;
    const testType = await dataSource.testTypes.get(pkg.testTypeId);
    const ordered = pkg.subtests
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((entry) => subtests.find((item) => item.id === entry.subtestId)!);

    const listening = ordered.find((item) => item.id === "st-toefl-listening")!;
    expect(listening.durationMinutes).toBeNull();

    const shares = subtestShares(pkg, ordered);
    const seconds = ordered.map((subtest) => subtestSeconds(subtest, testType, pkg, shares[subtest.id]));
    const total = seconds.reduce((sum, value) => sum + value, 0);

    // The three sections together cover the package duration (50 minutes).
    expect(total).toBeGreaterThanOrEqual(50 * 60 - 2);
    expect(total).toBeLessThanOrEqual(50 * 60 + 2);
    // The split follows the number of questions in the package.
    const counts = pkg.subtests
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.questionIds.length);
    expect(Object.values(shares).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
    expect(shares["st-toefl-listening"]).toBeCloseTo(counts[0] / counts.reduce((sum, value) => sum + value, 0), 5);
    expect(seconds[0]).toBeLessThan(50 * 60);
  });

  it("keeps an explicit subtest duration", async () => {
    const subtests = await dataSource.subtests.list();
    const pkg = (await dataSource.packages.get("pkg-skd-a"))!;
    const twk = subtests.find((item) => item.id === "st-twk")!;
    expect(subtestSeconds(twk, null, pkg)).toBeGreaterThan(0);
    const kecermatan = subtests.find((item) => item.id === "st-kecermatan-karakter")!;
    expect(subtestSeconds(kecermatan, null, (await dataSource.packages.get("pkg-kecermatan"))!)).toBe(8 * 60);
  });

  it("grades an attempt per subtest and ranks it nationally", async () => {
    const attempt = await startAttempt({ userId: "usr-participant-4", packageId: "pkg-skd-a" });
    const ctx = (await loadExamContext(attempt.id))!;

    const answers: Record<string, AnswerRecord> = {};
    for (const [subtestId, ids] of Object.entries(ctx.questionOrder)) {
      for (const id of ids.slice(0, 3)) {
        const question = ctx.questions[id];
        const value = sampleAnswer(question);
        if (!value) continue;
        answers[id] = {
          questionId: id,
          type: question.type,
          value,
          marked: false,
          updatedAt: new Date().toISOString(),
          timeSpentSeconds: 12,
        };
      }
      expect(ids.length).toBeGreaterThan(0);
      expect(subtestId).toBeTruthy();
    }
    await dataSource.attempts.saveAnswers(attempt.id, answers);

    const result = await gradeAttempt(attempt.id);
    expect(result.perSubtest).toHaveLength(3);
    expect(result.maxScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.percentile).toBeGreaterThanOrEqual(1);
    expect(result.percentile).toBeLessThanOrEqual(99);
    expect(result.rank).toBeGreaterThanOrEqual(1);
    expect(result.rank).toBeLessThanOrEqual(result.totalParticipants);
    expect(result.status).toBe("auto");

    // TWK: 5 points per correct answer, passing grade scaled to the question count.
    const twk = result.perSubtest.find((item) => item.subtestId === "st-twk")!;
    expect(twk.correct).toBe(3);
    expect(twk.rawScore).toBe(15);
    expect(twk.passingGrade).toBe(Math.round((65 * ctx.questionOrder["st-twk"].length) / 30));
  });

  it("submits the attempt and stores the result", async () => {
    const attempt = await startAttempt({ userId: "usr-participant-5", packageId: "pkg-toefl-mini" });
    const ctx = (await loadExamContext(attempt.id))!;

    const answers: Record<string, AnswerRecord> = {};
    for (const id of Object.values(ctx.questionOrder).flat()) {
      const question = ctx.questions[id];
      const value = sampleAnswer(question);
      if (!value) continue;
      answers[id] = {
        questionId: id,
        type: question.type,
        value,
        marked: false,
        updatedAt: new Date().toISOString(),
        timeSpentSeconds: 20,
      };
    }
    await dataSource.attempts.saveAnswers(attempt.id, answers);

    const submitted = await submitAttempt(attempt.id);
    expect(submitted.status).toBe("submitted");
    expect(submitted.result).toBeDefined();
    expect(submitted.submittedAt).toBeTruthy();

    // TOEFL converts every section, so an overall scaled score is produced.
    expect(submitted.result!.scaledScore).toBeGreaterThanOrEqual(310);
    expect(submitted.result!.scaledScore).toBeLessThanOrEqual(677);
  });

  it("marks attempts with essays as awaiting manual grading", async () => {
    const attempt = await startAttempt({ userId: "usr-participant-6", packageId: "pkg-umum-1" });
    const ctx = (await loadExamContext(attempt.id))!;
    const essay = Object.values(ctx.questions).find((question) => question.type === "essay");
    expect(essay).toBeDefined();

    await dataSource.attempts.saveAnswers(attempt.id, {
      [essay!.id]: {
        questionId: essay!.id,
        type: "essay",
        value: { kind: "text", text: "Jawaban essay percobaan." },
        marked: false,
        updatedAt: new Date().toISOString(),
        timeSpentSeconds: 60,
      },
    });

    const result = await gradeAttempt(attempt.id);
    expect(result.status).toBe("awaiting-manual");
  });
});
