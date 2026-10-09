import { describe, expect, it } from "vitest";
import type {
  ConversionTable,
  EssayQuestion,
  FillBlankQuestion,
  KraepelinQuestion,
  KecermatanKarakterQuestion,
  LikertQuestion,
  ListeningQuestion,
  MatchingQuestion,
  MultipleAnswerQuestion,
  MultipleChoiceQuestion,
  Question,
  ScoringRules,
  Subtest,
  TrueFalseQuestion,
  WeightedChoiceQuestion,
} from "@/types";
import {
  aggregateDimensions,
  applyConversion,
  effectivePassingGrade,
  matchBlank,
  scoreAttempt,
  scoreEssayKeywords,
  scoreQuestion,
  scoreSubtest,
} from "./index";

const RULES: ScoringRules = { correct: 5, wrong: 0, empty: 0 };
const PENALTY: ScoringRules = { correct: 4, wrong: -1, empty: 0 };
const RAW: ScoringRules = { correct: 1, wrong: 0, empty: 0 };

function base<T extends Question>(question: Omit<T, "createdAt" | "updatedAt">): T {
  return {
    ...question,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  } as T;
}

const mcq = base<MultipleChoiceQuestion>({
  id: "q1",
  type: "multiple-choice",
  testTypeId: "tt",
  subtestId: "st",
  difficulty: "easy",
  topics: [],
  tags: [],
  prompt: { id: "<p>2 + 2 = ?</p>" },
  options: [
    { id: "a", content: { id: "3" } },
    { id: "b", content: { id: "4" } },
  ],
  correctOptionId: "b",
});

describe("multiple choice", () => {
  it("awards `correct` points for the right option", () => {
    expect(scoreQuestion(mcq, { kind: "choice", optionId: "b" }, RULES)).toMatchObject({
      points: 5,
      maxPoints: 5,
      correct: true,
    });
  });

  it("awards `wrong` points (possibly negative) for a wrong option", () => {
    expect(scoreQuestion(mcq, { kind: "choice", optionId: "a" }, RULES)).toMatchObject({
      points: 0,
      correct: false,
    });
    expect(scoreQuestion(mcq, { kind: "choice", optionId: "a" }, PENALTY).points).toBe(-1);
  });

  it("awards `empty` points when unanswered", () => {
    expect(scoreQuestion(mcq, null, PENALTY)).toMatchObject({ points: 0, correct: null });
  });
});

describe("multiple answer", () => {
  const question = base<MultipleAnswerQuestion>({
    id: "q2",
    type: "multiple-answer",
    testTypeId: "tt",
    subtestId: "st",
    difficulty: "medium",
    topics: [],
    tags: [],
    prompt: { id: "<p>Pick the renewable ones</p>" },
    options: [
      { id: "a", content: { id: "Wind" } },
      { id: "b", content: { id: "Coal" } },
      { id: "c", content: { id: "Solar" } },
    ],
    correctOptionIds: ["a", "c"],
    partialScoring: true,
    penalizeWrong: true,
  });

  it("gives full points for the exact set", () => {
    expect(scoreQuestion(question, { kind: "choices", optionIds: ["a", "c"] }, RULES).points).toBe(5);
  });

  it("gives partial credit minus wrong picks", () => {
    // 1 right (2.5) - 1 wrong (2.5) = 0
    expect(scoreQuestion(question, { kind: "choices", optionIds: ["a", "b"] }, RULES).points).toBe(0);
    expect(scoreQuestion(question, { kind: "choices", optionIds: ["a"] }, RULES).points).toBe(2.5);
  });

  it("is all-or-nothing when partial scoring is off", () => {
    const strict = { ...question, partialScoring: false };
    expect(scoreQuestion(strict, { kind: "choices", optionIds: ["a"] }, RULES).points).toBe(0);
  });
});

describe("weighted choice (TKP / personality)", () => {
  const question = base<WeightedChoiceQuestion>({
    id: "q3",
    type: "weighted-choice",
    testTypeId: "tt",
    subtestId: "st",
    difficulty: "medium",
    topics: [],
    tags: [],
    prompt: { id: "<p>What would you do?</p>" },
    options: [
      { id: "a", content: { id: "Ignore" }, weight: 1 },
      { id: "b", content: { id: "Help" }, weight: 5 },
    ],
    mode: "weight",
    targetOptionId: "b",
    minWeight: 1,
    maxWeight: 5,
  });

  it("scores the weight of the selected option", () => {
    expect(scoreQuestion(question, { kind: "choice", optionId: "b" }, RAW)).toMatchObject({
      points: 5,
      maxPoints: 5,
    });
    expect(scoreQuestion(question, { kind: "choice", optionId: "a" }, RAW).points).toBe(1);
  });

  it("supports distance-to-target scoring", () => {
    const closest = { ...question, mode: "closest" as const };
    expect(scoreQuestion(closest, { kind: "choice", optionId: "a" }, RAW).points).toBe(1);
  });
});

describe("fill in the blank", () => {
  const blank: FillBlankQuestion["blanks"][number] = {
    id: "b1",
    input: "text",
    mode: "advanced",
    accepted: ["23/20", "1.15"],
    ignoreWhitespace: true,
  };

  it("ignores case and whitespace in advanced mode", () => {
    expect(matchBlank(blank, " 23/20 ")).toBe(true);
    expect(matchBlank(blank, "1,15")).toBe(false);
    expect(matchBlank(blank, "")).toBe(false);
  });

  it("applies numeric tolerance", () => {
    const numeric = { ...blank, mode: "numeric" as const, accepted: ["7.07"], tolerance: 0.5 };
    expect(matchBlank(numeric, "7.1")).toBe(true);
    expect(matchBlank(numeric, "7.7")).toBe(false);
  });

  it("supports regex mode", () => {
    const regex = { ...blank, mode: "regex" as const, pattern: "^\\d{4}$" };
    expect(matchBlank(regex, "1945")).toBe(true);
    expect(matchBlank(regex, "45")).toBe(false);
  });

  it("scores all-or-nothing or per blank", () => {
    const question = base<FillBlankQuestion>({
      id: "q4",
      type: "fill-blank",
      testTypeId: "tt",
      subtestId: "st",
      difficulty: "medium",
      topics: [],
      tags: [],
      prompt: { id: "<p>Fill it</p>" },
      template: { id: "<p>{{b1}} and {{b2}}</p>" },
      blanks: [blank, { ...blank, id: "b2", accepted: ["1945"] }],
      partialScoring: false,
    });

    const all = scoreQuestion(
      question,
      { kind: "blanks", values: { b1: "23/20", b2: "1945" } },
      RULES,
    );
    expect(all.points).toBe(5);

    const partial = scoreQuestion(
      { ...question, partialScoring: true },
      { kind: "blanks", values: { b1: "23/20", b2: "1900" } },
      RULES,
    );
    expect(partial.points).toBe(2.5);
    expect(partial.detail).toEqual({ b1: true, b2: false });
  });
});

describe("essay", () => {
  const question = base<EssayQuestion>({
    id: "q5",
    type: "essay",
    testTypeId: "tt",
    subtestId: "st",
    difficulty: "hard",
    topics: [],
    tags: [],
    prompt: { id: "<p>Explain</p>" },
    length: "short",
    maxScore: 10,
    keywords: [
      { term: "hoaks", points: 3 },
      { term: "verifikasi", points: 3 },
    ],
    rubric: [],
    manualGrading: false,
  });

  it("auto-scores keywords, capped at the max score", () => {
    const result = scoreQuestion(question, { kind: "text", text: "Verifikasi sumber mencegah hoaks." }, RAW);
    expect(result.points).toBe(6);
    expect(result.detail).toEqual({ hoaks: true, verifikasi: true });
  });

  it("flags manual grading instead of scoring", () => {
    const manual = { ...question, manualGrading: true };
    const result = scoreQuestion(manual, { kind: "text", text: "A long answer about hoaks." }, RAW);
    expect(result.points).toBe(0);
    expect(result.needsManualGrading).toBe(true);
  });

  it("never exceeds maxScore", () => {
    expect(scoreEssayKeywords({ ...question, maxScore: 4 }, "hoaks verifikasi").points).toBe(4);
  });
});

describe("true/false & yes/no", () => {
  const question = base<TrueFalseQuestion>({
    id: "q6",
    type: "true-false",
    testTypeId: "tt",
    subtestId: "st",
    difficulty: "easy",
    topics: [],
    tags: [],
    prompt: { id: "<p>All primes are odd</p>" },
    variant: "true-false",
    correct: false,
  });

  it("scores the boolean answer", () => {
    expect(scoreQuestion(question, { kind: "boolean", value: false }, RULES).correct).toBe(true);
    expect(scoreQuestion(question, { kind: "boolean", value: true }, RULES).correct).toBe(false);
    expect(scoreQuestion(question, null, RULES).correct).toBeNull();
  });
});

describe("matching & ordering", () => {
  const matching = base<MatchingQuestion>({
    id: "q7",
    type: "matching",
    testTypeId: "tt",
    subtestId: "st",
    difficulty: "medium",
    topics: [],
    tags: [],
    prompt: { id: "<p>Match</p>" },
    pairs: [
      { id: "p1", left: { id: "WHO" }, right: { id: "Health" } },
      { id: "p2", left: { id: "WTO" }, right: { id: "Trade" } },
    ],
    distractors: [],
    partialScoring: true,
  });

  it("scores each pair", () => {
    const result = scoreQuestion(
      matching,
      { kind: "matching", map: { p1: "p1", p2: "p2" } },
      RULES,
    );
    expect(result.points).toBe(5);

    const half = scoreQuestion(matching, { kind: "matching", map: { p1: "p1", p2: "p1" } }, RULES);
    expect(half.points).toBe(2.5);
  });
});

describe("listening delegates to the wrapped question", () => {
  it("scores the inner multiple choice", () => {
    const listening = base<ListeningQuestion>({
      id: "q8",
      type: "listening",
      testTypeId: "tt",
      subtestId: "st",
      difficulty: "medium",
      topics: [],
      tags: [],
      prompt: { id: "<p>Listen</p>" },
      audioUrl: "/audio/a.wav",
      maxPlays: 1,
      allowSeek: false,
      inner: mcq,
    });
    expect(scoreQuestion(listening, { kind: "choice", optionId: "b" }, RULES).correct).toBe(true);
  });
});

describe("kecermatan", () => {
  it("scores kraepelin digit columns", () => {
    const question = base<KraepelinQuestion>({
      id: "q9",
      type: "kecermatan-kraepelin",
      testTypeId: "tt",
      subtestId: "st",
      difficulty: "medium",
      topics: [],
      tags: [],
      prompt: { id: "<p>Add adjacent digits</p>" },
      column: 1,
      rows: [1, 2, 3],
      correctAnswers: ["3", "5"],
    });

    expect(scoreQuestion(question, { kind: "digits", digits: ["3", "5"] }, RAW)).toMatchObject({
      points: 2,
      maxPoints: 2,
      correct: true,
    });
    expect(scoreQuestion(question, { kind: "digits", digits: ["3", "9"] }, RAW).points).toBe(1);
  });

  it("scores the missing character", () => {
    const question = base<KecermatanKarakterQuestion>({
      id: "q10",
      type: "kecermatan-karakter",
      testTypeId: "tt",
      subtestId: "st",
      difficulty: "easy",
      topics: [],
      tags: [],
      prompt: { id: "<p>Find the missing one</p>" },
      variant: "mixed",
      column: 1,
      indexInColumn: 1,
      keyRow: ["A", "7", "!", "K", "9"],
      shown: ["A", "!", "K", "9"],
      correctIndex: 1,
    });
    expect(scoreQuestion(question, { kind: "choice", optionId: "1" }, RAW).correct).toBe(true);
    expect(scoreQuestion(question, { kind: "choice", optionId: "0" }, RAW).correct).toBe(false);
  });
});

describe("likert / personality profile", () => {
  const question = base<LikertQuestion>({
    id: "q11",
    type: "likert",
    testTypeId: "tt",
    subtestId: "st",
    difficulty: "easy",
    topics: [],
    tags: [],
    prompt: { id: "<p>Rate</p>" },
    statement: { id: "I like new ideas" },
    min: 1,
    max: 5,
    minLabel: { id: "STP" },
    maxLabel: { id: "SS" },
    dimension: "O",
    reversed: false,
  });

  it("is never right or wrong", () => {
    expect(scoreQuestion(question, { kind: "scale", value: 4 }, RAW)).toMatchObject({
      points: 4,
      maxPoints: 5,
      correct: null,
    });
  });

  it("reverse-scores reversed items", () => {
    expect(scoreQuestion({ ...question, reversed: true }, { kind: "scale", value: 4 }, RAW).points).toBe(2);
  });

  it("aggregates dimensions into a 0–100 profile", () => {
    const subtest = {
      id: "st",
      name: { id: "Kepribadian" },
      dimensions: [{ key: "O", label: { id: "Keterbukaan" } }],
    } as Subtest;
    const dimensions = aggregateDimensions(
      [subtest],
      [question, { ...question, id: "q12" }],
      {
        q11: { questionId: "q11", type: "likert", value: { kind: "scale", value: 5 }, marked: false, updatedAt: "", timeSpentSeconds: 0 },
        q12: { questionId: "q12", type: "likert", value: { kind: "scale", value: 3 }, marked: false, updatedAt: "", timeSpentSeconds: 0 },
      },
    );
    expect(dimensions).toEqual([
      { dimension: "O", label: { id: "Keterbukaan" }, raw: 8, max: 10, score: 80 },
    ]);
  });
});

describe("passing grades & conversion tables", () => {
  it("scales the passing grade to the actual number of questions", () => {
    const subtest = { passingGrade: 65, questionCount: 30 } as Subtest;
    expect(effectivePassingGrade(subtest, 30)).toBe(65);
    expect(effectivePassingGrade(subtest, 10)).toBe(22);
    expect(effectivePassingGrade({ ...subtest, passingGrade: null }, 10)).toBeNull();
  });

  it("projects a mini-section raw score onto the TOEFL table", () => {
    const table: ConversionTable = {
      id: "ct",
      testTypeId: "tt",
      name: { id: "table" },
      min: 31,
      max: 68,
      entries: [
        { raw: 0, scaled: 31 },
        { raw: 20, scaled: 50 },
        { raw: 50, scaled: 68 },
      ],
    };
    // 2 of 3 correct → projected to 33/50 → scaled 50
    expect(applyConversion(table, 2, 3, 50)).toBe(50);
    expect(applyConversion(table, 3, 3, 50)).toBe(68);
  });
});

describe("subtest & attempt scoring", () => {
  const subtest: Subtest = {
    id: "st",
    testTypeId: "tt",
    name: { id: "TWK" },
    order: 1,
    durationMinutes: null,
    questionCount: 30,
    scoring: RULES,
    passingGrade: 65,
    allowedQuestionTypes: ["multiple-choice"],
    shuffleQuestions: false,
    shuffleOptions: false,
    allowBack: false,
  };

  it("sums points and counts correct/wrong/empty", () => {
    const result = scoreSubtest({
      subtest,
      questions: [mcq, { ...mcq, id: "q1b" }],
      answers: {
        q1: { questionId: "q1", type: "multiple-choice", value: { kind: "choice", optionId: "b" }, marked: false, updatedAt: "", timeSpentSeconds: 0 },
      },
    });
    expect(result).toMatchObject({
      rawScore: 5,
      maxScore: 10,
      correct: 1,
      wrong: 0,
      empty: 1,
      passingGrade: 4, // 65 * 2/30 ≈ 4
      passed: true,
    });
  });

  it("produces an attempt result with ranking and per-subtest breakdown", () => {
    const result = scoreAttempt({
      attemptId: "att-1",
      subtests: [subtest],
      questions: [mcq, { ...mcq, id: "q1b" }],
      questionOrder: { st: ["q1", "q1b"] },
      answers: {
        q1: { questionId: "q1", type: "multiple-choice", value: { kind: "choice", optionId: "b" }, marked: false, updatedAt: "", timeSpentSeconds: 0 },
        q1b: { questionId: "q1b", type: "multiple-choice", value: { kind: "choice", optionId: "a" }, marked: true, updatedAt: "", timeSpentSeconds: 0 },
      },
      conversionTables: [],
      startedAt: "2025-01-01T00:00:00.000Z",
      submittedAt: "2025-01-01T01:00:00.000Z",
      totalParticipants: 1_000,
    });

    expect(result.totalScore).toBe(5);
    expect(result.maxScore).toBe(10);
    expect(result.percentage).toBe(50);
    expect(result.perSubtest).toHaveLength(1);
    expect(result.durationSeconds).toBe(3_600);
    expect(result.percentile).toBeGreaterThan(0);
    expect(result.percentile).toBeLessThanOrEqual(99);
    expect(result.rank).toBeGreaterThan(0);
    expect(result.status).toBe("auto");
  });
});

describe("manual grading", () => {
  const essaySubtest: Subtest = {
    id: "st",
    testTypeId: "tt",
    name: { id: "Essay" },
    order: 1,
    durationMinutes: 30,
    questionCount: 1,
    scoring: RULES,
    passingGrade: null,
    allowedQuestionTypes: ["essay"],
    shuffleQuestions: false,
    shuffleOptions: false,
    allowBack: false,
  };

  const essay = base<EssayQuestion>({
    id: "q9",
    type: "essay",
    testTypeId: "tt",
    subtestId: "st",
    difficulty: "medium",
    topics: [],
    tags: [],
    prompt: { id: "<p>Jelaskan</p>" },
    length: "long",
    maxScore: 10,
    keywords: [{ term: "hoaks", points: 3 }],
    rubric: [],
    manualGrading: true,
  });

  const answered = {
    questionId: "q9",
    type: "essay" as const,
    value: { kind: "text" as const, text: "Verifikasi dulu sebelum membagikan." },
    marked: false,
    updatedAt: "",
    timeSpentSeconds: 0,
  };

  it("ignores an ungraded essay so the result stays pending", () => {
    const result = scoreAttempt({
      attemptId: "att-essay",
      subtests: [essaySubtest],
      questions: [essay],
      questionOrder: { st: ["q9"] },
      answers: { q9: answered },
      conversionTables: [],
      startedAt: "2025-01-01T00:00:00.000Z",
      submittedAt: "2025-01-01T00:30:00.000Z",
    });
    expect(result.status).toBe("awaiting-manual");
    expect(result.totalScore).toBe(0);
  });

  it("uses the manual score once graded and marks the result graded", () => {
    const result = scoreAttempt({
      attemptId: "att-essay",
      subtests: [essaySubtest],
      questions: [essay],
      questionOrder: { st: ["q9"] },
      answers: { q9: { ...answered, manualScore: 8, gradedAt: "2025-01-02T00:00:00.000Z" } },
      conversionTables: [],
      startedAt: "2025-01-01T00:00:00.000Z",
      submittedAt: "2025-01-01T00:30:00.000Z",
    });
    expect(result.status).toBe("graded");
    expect(result.totalScore).toBe(8);
    expect(result.maxScore).toBe(10);
    expect(result.perSubtest[0]).toMatchObject({ correct: 1, wrong: 0, empty: 0 });
  });

  it("clamps a manual score to the question maximum", () => {
    const result = scoreSubtest({
      subtest: essaySubtest,
      questions: [essay],
      answers: { q9: { ...answered, manualScore: 99 } },
    });
    expect(result.rawScore).toBe(10);
    expect(result.maxScore).toBe(10);
  });

  it("counts a zero manual score as wrong, not empty", () => {
    const result = scoreSubtest({
      subtest: essaySubtest,
      questions: [essay],
      answers: { q9: { ...answered, manualScore: 0 } },
    });
    expect(result).toMatchObject({ rawScore: 0, correct: 0, wrong: 1, empty: 0 });
  });
});
