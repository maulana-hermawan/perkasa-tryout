import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "./index";

const db = createSeedDatabase();

describe("seed database integrity", () => {
  it("exposes every collection", () => {
    expect(db.users.length).toBeGreaterThan(0);
    expect(db.categories.length).toBeGreaterThan(0);
    expect(db.testTypes.length).toBeGreaterThan(0);
    expect(db.subtests.length).toBeGreaterThan(0);
    expect(db.questions.length).toBeGreaterThan(50);
    expect(db.packages.length).toBeGreaterThanOrEqual(5);
    expect(db.sessions.length).toBeGreaterThan(0);
    expect(db.payments.length).toBeGreaterThan(0);
    expect(db.vouchers.length).toBeGreaterThan(0);
    expect(db.activityLogs.length).toBeGreaterThan(0);
  });

  it("only references existing subtests, test types and categories", () => {
    const subtestIds = new Set(db.subtests.map((item) => item.id));
    const testTypeIds = new Set(db.testTypes.map((item) => item.id));
    const categoryIds = new Set(db.categories.map((item) => item.id));
    const questionIds = new Set(db.questions.map((item) => item.id));

    for (const subtest of db.subtests) expect(testTypeIds.has(subtest.testTypeId)).toBe(true);
    for (const question of db.questions) {
      expect(subtestIds.has(question.subtestId)).toBe(true);
      expect(testTypeIds.has(question.testTypeId)).toBe(true);
    }
    for (const pkg of db.packages) {
      expect(categoryIds.has(pkg.categoryId)).toBe(true);
      expect(testTypeIds.has(pkg.testTypeId)).toBe(true);
      for (const entry of pkg.subtests) {
        expect(subtestIds.has(entry.subtestId)).toBe(true);
        for (const questionId of entry.questionIds) expect(questionIds.has(questionId)).toBe(true);
      }
    }
  });

  it("keeps the objective questions solvable (a correct answer exists)", () => {
    for (const question of db.questions) {
      switch (question.type) {
        case "multiple-choice":
        case "image-choice":
          expect(question.options.some((option) => option.id === question.correctOptionId)).toBe(true);
          break;
        case "multiple-answer":
          expect(question.correctOptionIds.length).toBeGreaterThan(0);
          break;
        case "weighted-choice":
          expect(question.options.every((option) => typeof option.weight === "number")).toBe(true);
          break;
        case "matching":
          expect(question.pairs.length).toBeGreaterThan(0);
          break;
        case "fill-blank":
          expect(question.blanks.every((blank) => blank.accepted.length > 0)).toBe(true);
          break;
        case "kecermatan-kraepelin":
          expect(question.correctAnswers.length).toBe(question.rows.length - 1);
          break;
        case "essay":
          expect(question.maxScore).toBeGreaterThan(0);
          break;
        default:
          break;
      }
    }
  });

  it("ships demo accounts for every role", () => {
    const roles = new Set(db.users.map((user) => user.role));
    expect(roles).toEqual(new Set(["admin", "host", "participant"]));
  });

  it("pre-computes results for the seeded attempts", () => {
    const submitted = db.attempts.filter((attempt) => attempt.status === "submitted");
    expect(submitted.length).toBeGreaterThan(0);
    for (const attempt of submitted) {
      expect(attempt.result).toBeDefined();
      expect(attempt.result!.maxScore).toBeGreaterThan(0);
      expect(attempt.result!.totalScore).toBeGreaterThan(0);
      expect(attempt.result!.perSubtest.length).toBeGreaterThan(0);
    }
  });

  it("produces a Big Five profile for the personality attempt", () => {
    const attempt = db.attempts.find((item) => item.id === "att-kepribadian-1");
    const dimensions = attempt?.result?.dimensions ?? [];
    expect(dimensions.map((item) => item.dimension).sort()).toEqual(["A", "C", "E", "N", "O"]);
    for (const dimension of dimensions) {
      expect(dimension.score).toBeGreaterThanOrEqual(0);
      expect(dimension.score).toBeLessThanOrEqual(100);
    }
  });

  it("converts the mini TOEFL score onto the 310–677 scale", () => {
    const attempt = db.attempts.find((item) => item.id === "att-toefl-1");
    expect(attempt?.result?.scaledScore).toBeGreaterThanOrEqual(310);
    expect(attempt?.result?.scaledScore).toBeLessThanOrEqual(677);
  });

  it("uses 6-character session codes", () => {
    for (const session of db.sessions) expect(session.code).toHaveLength(6);
  });
});
