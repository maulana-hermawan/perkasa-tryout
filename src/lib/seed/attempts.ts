import { scoreAttempt } from "@/lib/scoring";
import type { AnswerRecord, AnswerValue, Attempt, Question } from "@/types";
import { daysAgo, hoursAgo } from "./helpers";
import { PSIKOTES_QUESTIONS, SKD_QUESTIONS, TOEFL_QUESTIONS, UMUM_QUESTIONS } from "./questions";
import { SEED_CONVERSION_TABLES, SEED_SUBTESTS } from "./taxonomy";

const ALL_QUESTIONS: Question[] = [...SKD_QUESTIONS, ...TOEFL_QUESTIONS, ...PSIKOTES_QUESTIONS, ...UMUM_QUESTIONS];
const QUESTION_MAP = new Map(ALL_QUESTIONS.map((question) => [question.id, question]));

type Outcome = "correct" | "wrong" | "empty" | number;

/**
 * A realistic short essay so the manual-grading queue (and the "awaiting
 * manual grade" state on the result screen) has something to show.
 */
const ESSAY_SAMPLE = [
  "Literasi digital penting agar pelajar mampu melakukan verifikasi setiap sumber",
  "informasi sebelum membagikannya, sehingga terhindar dari hoaks yang merugikan.",
  "Selain itu, pemahaman tentang privasi data dan etika bermedia membantu pelajar",
  "menjaga jejak digitalnya tetap aman dan bertanggung jawab di ruang publik.",
].join(" ");

/** Build the raw answer payload for a question given the desired outcome. */
function answerValue(question: Question, outcome: Outcome): AnswerValue | null {
  if (outcome === "empty") return null;

  switch (question.type) {
    case "multiple-choice":
    case "image-choice": {
      const correctId = question.correctOptionId;
      if (outcome === "correct") return { kind: "choice", optionId: correctId };
      const wrong = question.options.find((option) => option.id !== correctId);
      return { kind: "choice", optionId: wrong?.id ?? correctId };
    }
    case "weighted-choice": {
      const target = typeof outcome === "number" ? outcome : (question.maxWeight ?? 5);
      const match =
        question.options.find((option) => option.weight === target) ??
        question.options.find((option) => option.id === question.targetOptionId) ??
        question.options[0];
      return { kind: "choice", optionId: match.id };
    }
    case "listening":
      return answerValue(question.inner, outcome);
    case "fill-blank": {
      const values: Record<string, string> = {};
      question.blanks.forEach((blank) => {
        if (outcome === "wrong") {
          values[blank.id] = blank.input === "dropdown" ? "x" : "salah";
        } else {
          values[blank.id] = blank.accepted[0] ?? "";
        }
      });
      return { kind: "blanks", values };
    }
    case "true-false":
      return { kind: "boolean", value: outcome === "correct" ? question.correct : !question.correct };
    case "multiple-answer":
      return outcome === "correct"
        ? { kind: "choices", optionIds: question.correctOptionIds }
        : { kind: "choices", optionIds: question.options.slice(0, 2).map((option) => option.id) };
    case "matching": {
      const map: Record<string, string> = {};
      question.pairs.forEach((pair, index) => {
        map[pair.id] = outcome === "wrong" && index % 2 === 1 ? "distractor" : pair.id;
      });
      return { kind: "matching", map };
    }
    case "ordering":
      return outcome === "correct"
        ? { kind: "order", itemIds: question.correctOrder }
        : { kind: "order", itemIds: [...question.items].reverse().map((item) => item.id) };
    case "likert": {
      const value = typeof outcome === "number" ? outcome : question.max;
      return { kind: "scale", value };
    }
    case "group": {
      const values: Record<string, AnswerValue | null> = {};
      question.children.forEach((child, index) => {
        values[child.id] = answerValue(child, outcome === "wrong" && index % 2 === 1 ? "correct" : outcome);
      });
      return { kind: "group", values };
    }
    case "kecermatan-karakter":
      return { kind: "choice", optionId: outcome === "correct" ? String(question.correctIndex) : "0" };
    case "kecermatan-perbandingan":
      return { kind: "comparison", value: outcome === "correct" ? question.correct : "=" };
    case "kecermatan-kraepelin":
      return { kind: "digits", digits: question.correctAnswers.map((answer) => (outcome === "correct" ? answer : "")) };
    case "essay":
      return { kind: "text", text: ESSAY_SAMPLE };
    default:
      return null;
  }
}

function buildAnswers(
  entries: { questionId: string; outcome: Outcome }[],
  baseTime: string,
): Record<string, AnswerRecord> {
  const answers: Record<string, AnswerRecord> = {};
  entries.forEach((entry, index) => {
    const question = QUESTION_MAP.get(entry.questionId);
    if (!question) return;
    answers[entry.questionId] = {
      questionId: entry.questionId,
      type: question.type,
      value: answerValue(question, entry.outcome),
      marked: entry.outcome === "wrong" && index % 5 === 0,
      updatedAt: new Date(new Date(baseTime).getTime() + index * 47_000).toISOString(),
      timeSpentSeconds: 35 + (index % 7) * 9,
    };
  });
  return answers;
}

const subtestById = (id: string) => {
  const subtest = SEED_SUBTESTS.find((item) => item.id === id);
  if (!subtest) throw new Error(`Unknown subtest: ${id}`);
  return subtest;
};

/* ----------------------------- 1. SKD attempt ----------------------------- */

const SKD_ORDER = {
  "st-twk": SKD_QUESTIONS.filter((item) => item.subtestId === "st-twk").map((item) => item.id),
  "st-tiu": SKD_QUESTIONS.filter((item) => item.subtestId === "st-tiu").map((item) => item.id),
  "st-tkp": SKD_QUESTIONS.filter((item) => item.subtestId === "st-tkp").map((item) => item.id),
};

const skdStartedAt = new Date(new Date(daysAgo(6)).getTime() - 100 * 60_000).toISOString();
const skdSubmittedAt = daysAgo(6);

const skdEntries = [
  ...SKD_ORDER["st-twk"].map((questionId, index) => ({
    questionId,
    outcome: (index < 8 ? "correct" : "wrong") as Outcome,
  })),
  ...SKD_ORDER["st-tiu"].map((questionId, index) => ({
    questionId,
    outcome: (index < 7 ? "correct" : "wrong") as Outcome,
  })),
  ...SKD_ORDER["st-tkp"].map((questionId, index) => ({
    questionId,
    outcome: [4, 5, 3, 4, 3, 4][index] as Outcome,
  })),
];

const skdAnswers = buildAnswers(skdEntries, skdStartedAt);

/* ---------------------------- 2. TOEFL attempt ---------------------------- */

const TOEFL_ORDER = {
  "st-toefl-listening": TOEFL_QUESTIONS.filter((item) => item.subtestId === "st-toefl-listening").map((item) => item.id),
  "st-toefl-structure": TOEFL_QUESTIONS.filter((item) => item.subtestId === "st-toefl-structure").map((item) => item.id),
  "st-toefl-reading": TOEFL_QUESTIONS.filter((item) => item.subtestId === "st-toefl-reading").map((item) => item.id),
};

const toeflStartedAt = new Date(new Date(daysAgo(2)).getTime() - 48 * 60_000).toISOString();
const toeflSubmittedAt = daysAgo(2);

const toeflAnswers = buildAnswers(
  [
    ...TOEFL_ORDER["st-toefl-listening"].map((questionId, index) => ({
      questionId,
      outcome: (index === 1 ? "wrong" : "correct") as Outcome,
    })),
    ...TOEFL_ORDER["st-toefl-structure"].map((questionId, index) => ({
      questionId,
      outcome: (index === 2 || index === 4 ? "wrong" : "correct") as Outcome,
    })),
    ...TOEFL_ORDER["st-toefl-reading"].map((questionId, index) => ({
      questionId,
      outcome: (index === 1 ? "wrong" : "correct") as Outcome,
    })),
  ],
  toeflStartedAt,
);

/* ------------------------ 3. Personality attempt -------------------------- */

const KEP_ORDER = {
  "st-kepribadian": PSIKOTES_QUESTIONS.filter((item) => item.subtestId === "st-kepribadian").map((item) => item.id),
};

const kepStartedAt = new Date(new Date(daysAgo(1)).getTime() - 12 * 60_000).toISOString();
const kepSubmittedAt = daysAgo(1);

const kepAnswers = buildAnswers(
  KEP_ORDER["st-kepribadian"].map((questionId, index) => ({
    questionId,
    outcome: [4, 2, 5, 2, 4, 3, 5, 2, 3, 4, 5, 4][index] as Outcome,
  })),
  kepStartedAt,
);

/* --------------------- 4. In-progress general attempt --------------------- */

const UMUM_ORDER = {
  "st-umum-pu": UMUM_QUESTIONS.filter((item) => item.subtestId === "st-umum-pu").map((item) => item.id),
  "st-umum-logika": UMUM_QUESTIONS.filter((item) => item.subtestId === "st-umum-logika").map((item) => item.id),
  "st-umum-esai": UMUM_QUESTIONS.filter((item) => item.subtestId === "st-umum-esai").map((item) => item.id),
};

const umumStartedAt = hoursAgo(2);
const umumAnswers = buildAnswers(
  [
    { questionId: UMUM_ORDER["st-umum-pu"][0], outcome: "correct" as Outcome },
    { questionId: UMUM_ORDER["st-umum-pu"][1], outcome: "correct" as Outcome },
    { questionId: UMUM_ORDER["st-umum-pu"][2], outcome: "correct" as Outcome },
    { questionId: UMUM_ORDER["st-umum-logika"][0], outcome: "correct" as Outcome },
  ],
  umumStartedAt,
);

/* --------------------- 5. Short-essay attempt (grading) ------------------- */

const ESAI_STARTED = new Date(new Date(hoursAgo(20)).getTime()).toISOString();
const ESAI_SUBMITTED = hoursAgo(19);
const ESAI_ORDER = { "st-umum-esai": UMUM_ORDER["st-umum-esai"] };
const esaiAnswers = buildAnswers(
  UMUM_ORDER["st-umum-esai"].map((questionId) => ({
    questionId,
    outcome: "correct" as Outcome,
  })),
  ESAI_STARTED,
);

/* --------------------------- compute the results -------------------------- */

function compute(input: {
  attemptId: string;
  subtestIds: string[];
  questionOrder: Record<string, string[]>;
  answers: Record<string, AnswerRecord>;
  startedAt: string;
  submittedAt: string;
  totalParticipants: number;
  secondsPerSubtest?: Record<string, number>;
}) {
  return scoreAttempt({
    attemptId: input.attemptId,
    subtests: input.subtestIds.map(subtestById),
    questions: ALL_QUESTIONS,
    questionOrder: input.questionOrder,
    answers: input.answers,
    conversionTables: SEED_CONVERSION_TABLES,
    secondsPerSubtest: input.secondsPerSubtest,
    startedAt: input.startedAt,
    submittedAt: input.submittedAt,
    totalParticipants: input.totalParticipants,
  });
}

const skdResult = compute({
  attemptId: "att-skd-1",
  subtestIds: ["st-twk", "st-tiu", "st-tkp"],
  questionOrder: SKD_ORDER,
  answers: skdAnswers,
  startedAt: skdStartedAt,
  submittedAt: skdSubmittedAt,
  totalParticipants: 12_480,
  secondsPerSubtest: { "st-twk": 1_680, "st-tiu": 2_040, "st-tkp": 2_280 },
});

const toeflResult = compute({
  attemptId: "att-toefl-1",
  subtestIds: ["st-toefl-listening", "st-toefl-structure", "st-toefl-reading"],
  questionOrder: TOEFL_ORDER,
  answers: toeflAnswers,
  startedAt: toeflStartedAt,
  submittedAt: toeflSubmittedAt,
  totalParticipants: 3_210,
  secondsPerSubtest: { "st-toefl-listening": 900, "st-toefl-structure": 780, "st-toefl-reading": 1_020 },
});

const kepResult = compute({
  attemptId: "att-kepribadian-1",
  subtestIds: ["st-kepribadian"],
  questionOrder: KEP_ORDER,
  answers: kepAnswers,
  startedAt: kepStartedAt,
  submittedAt: kepSubmittedAt,
  totalParticipants: 2_870,
  secondsPerSubtest: { "st-kepribadian": 640 },
});

const esaiResult = compute({
  attemptId: "att-umum-esai-1",
  subtestIds: ["st-umum-esai"],
  questionOrder: ESAI_ORDER,
  answers: esaiAnswers,
  startedAt: ESAI_STARTED,
  submittedAt: ESAI_SUBMITTED,
  totalParticipants: 1_150,
  secondsPerSubtest: { "st-umum-esai": 1_180 },
});

export const SEED_ATTEMPTS: Attempt[] = [
  {
    id: "att-umum-esai-1",
    userId: "usr-participant-2",
    packageId: "pkg-umum-1",
    status: "submitted",
    startedAt: ESAI_STARTED,
    submittedAt: ESAI_SUBMITTED,
    answers: esaiAnswers,
    questionOrder: ESAI_ORDER,
    currentSubtestId: "st-umum-esai",
    currentIndex: 2,
    timeLeftSeconds: 0,
    tabSwitchCount: 0,
    subtestProgress: [
      {
        subtestId: "st-umum-esai",
        startedAt: ESAI_STARTED,
        endedAt: ESAI_SUBMITTED,
        secondsUsed: 1_180,
        order: 1,
      },
    ],
    result: esaiResult,
  },
  {
    id: "att-skd-1",
    userId: "usr-participant",
    packageId: "pkg-skd-a",
    status: "submitted",
    startedAt: skdStartedAt,
    submittedAt: skdSubmittedAt,
    answers: skdAnswers,
    questionOrder: SKD_ORDER,
    currentSubtestId: "st-tkp",
    currentIndex: 26,
    timeLeftSeconds: 0,
    tabSwitchCount: 1,
    subtestProgress: [
      { subtestId: "st-twk", startedAt: skdStartedAt, endedAt: new Date(new Date(skdStartedAt).getTime() + 1_680_000).toISOString(), secondsUsed: 1_680, order: 1 },
      { subtestId: "st-tiu", startedAt: new Date(new Date(skdStartedAt).getTime() + 1_680_000).toISOString(), endedAt: new Date(new Date(skdStartedAt).getTime() + 3_720_000).toISOString(), secondsUsed: 2_040, order: 2 },
      { subtestId: "st-tkp", startedAt: new Date(new Date(skdStartedAt).getTime() + 3_720_000).toISOString(), endedAt: skdSubmittedAt, secondsUsed: 2_280, order: 3 },
    ],
    result: skdResult,
  },
  {
    id: "att-toefl-1",
    userId: "usr-participant",
    packageId: "pkg-toefl-mini",
    status: "submitted",
    startedAt: toeflStartedAt,
    submittedAt: toeflSubmittedAt,
    answers: toeflAnswers,
    questionOrder: TOEFL_ORDER,
    currentSubtestId: "st-toefl-reading",
    currentIndex: 12,
    timeLeftSeconds: 0,
    tabSwitchCount: 0,
    subtestProgress: [
      { subtestId: "st-toefl-listening", startedAt: toeflStartedAt, endedAt: new Date(new Date(toeflStartedAt).getTime() + 900_000).toISOString(), secondsUsed: 900, order: 1 },
      { subtestId: "st-toefl-structure", startedAt: new Date(new Date(toeflStartedAt).getTime() + 900_000).toISOString(), endedAt: new Date(new Date(toeflStartedAt).getTime() + 1_680_000).toISOString(), secondsUsed: 780, order: 2 },
      { subtestId: "st-toefl-reading", startedAt: new Date(new Date(toeflStartedAt).getTime() + 1_680_000).toISOString(), endedAt: toeflSubmittedAt, secondsUsed: 1_020, order: 3 },
    ],
    result: toeflResult,
  },
  {
    id: "att-kepribadian-1",
    userId: "usr-participant",
    packageId: "pkg-kepribadian",
    status: "submitted",
    startedAt: kepStartedAt,
    submittedAt: kepSubmittedAt,
    answers: kepAnswers,
    questionOrder: KEP_ORDER,
    currentSubtestId: "st-kepribadian",
    currentIndex: 12,
    timeLeftSeconds: 0,
    tabSwitchCount: 0,
    subtestProgress: [
      { subtestId: "st-kepribadian", startedAt: kepStartedAt, endedAt: kepSubmittedAt, secondsUsed: 640, order: 1 },
    ],
    result: kepResult,
  },
  {
    id: "att-umum-1",
    userId: "usr-participant",
    packageId: "pkg-umum-1",
    status: "in-progress",
    startedAt: umumStartedAt,
    deadlineAt: minutesFromNowHelper(38),
    answers: umumAnswers,
    questionOrder: UMUM_ORDER,
    currentSubtestId: "st-umum-pu",
    currentIndex: 3,
    timeLeftSeconds: 2_280,
    tabSwitchCount: 0,
    subtestProgress: [
      { subtestId: "st-umum-pu", startedAt: umumStartedAt, secondsUsed: 1_320, order: 1 },
    ],
  },
];

function minutesFromNowHelper(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export const SEED_QUESTION_ORDER_EXAMPLES = { SKD_ORDER, TOEFL_ORDER, KEP_ORDER, UMUM_ORDER };
