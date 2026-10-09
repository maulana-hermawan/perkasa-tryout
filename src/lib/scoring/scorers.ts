import {
  isAnswered,
  type AnswerValue,
  type Question,
  type QuestionOf,
  type QuestionScoreResult,
  type QuestionType,
  type ScoringRules,
  type WeightedChoiceQuestion,
  type MultipleChoiceQuestion,
  type FillBlankQuestion,
  type EssayQuestion,
  type LikertQuestion,
  type KraepelinQuestion,
  type MatchingQuestion,
  type OrderingQuestion,
  type MultipleAnswerQuestion,
} from "@/types";

/* eslint-disable @typescript-eslint/no-unused-vars */

/** Every scorer receives the question, the answer, and the subtest rules. */
export type Scorer<Q extends Question = Question> = (
  question: Q,
  value: AnswerValue | null,
  rules: ScoringRules,
) => QuestionScoreResult;

function objective(value: AnswerValue | null, correct: boolean, rules: ScoringRules, maxPoints: number) {
  if (!isAnswered(value)) {
    return { points: rules.empty, maxPoints, correct: null };
  }
  return { points: correct ? rules.correct : rules.wrong, maxPoints, correct };
}

function choiceValue(value: AnswerValue | null): string | null {
  return value?.kind === "choice" ? value.optionId : null;
}

/* --------------------------- 1. multiple choice --------------------------- */

export const scoreMultipleChoice: Scorer<MultipleChoiceQuestion> = (question, value, rules) =>
  objective(value, choiceValue(value) === question.correctOptionId, rules, rules.correct);

/* -------------------------- 2. multiple answer ---------------------------- */

export const scoreMultipleAnswer: Scorer<MultipleAnswerQuestion> = (question, value, rules) => {
  const maxPoints = rules.correct;
  const picked = value?.kind === "choices" ? value.optionIds : [];
  if (picked.length === 0) return { points: rules.empty, maxPoints, correct: null };

  const expected = new Set(question.correctOptionIds);
  const right = picked.filter((id) => expected.has(id)).length;
  const wrong = picked.filter((id) => !expected.has(id)).length;
  const exact = right === expected.size && wrong === 0;

  if (!question.partialScoring) {
    return { points: exact ? rules.correct : rules.wrong, maxPoints, correct: exact };
  }

  const perOption = rules.correct / Math.max(1, expected.size);
  const penalty = question.penalizeWrong ? wrong * perOption : 0;
  const points = Math.max(-maxPoints, right * perOption - penalty);
  return { points, maxPoints, correct: exact, detail: { right, wrong } };
};

/* --------------------------- 3. weighted choice --------------------------- */

export const scoreWeightedChoice: Scorer<WeightedChoiceQuestion> = (question, value, rules) => {
  const weights = question.options.map((option) => option.weight ?? 0);
  const maxWeight = question.maxWeight ?? Math.max(...weights, 1);
  const minWeight = question.minWeight ?? Math.min(...weights, 0);
  const pickedId = choiceValue(value);
  const picked = question.options.find((option) => option.id === pickedId);

  if (!picked) {
    return { points: minWeight, maxPoints: maxWeight, correct: null };
  }

  const weight = picked.weight ?? 0;
  if (question.mode === "closest") {
    const target = question.options.find((option) => option.id === question.targetOptionId)?.weight ?? maxWeight;
    const distance = Math.abs(weight - target);
    return {
      points: Math.max(minWeight, maxWeight - distance),
      maxPoints: maxWeight,
      correct: distance === 0,
    };
  }

  return {
    points: weight,
    maxPoints: maxWeight,
    correct: question.targetOptionId ? pickedId === question.targetOptionId : null,
  };
};

/* ----------------------------- 4. fill blank ------------------------------ */

export interface BlankComparisonOptions {
  caseSensitive?: boolean;
  ignoreWhitespace?: boolean;
}

function normalize(input: string, options: BlankComparisonOptions) {
  let value = input.trim();
  if (!options.caseSensitive) value = value.toLowerCase();
  if (options.ignoreWhitespace) value = value.replace(/\s+/g, "");
  return value;
}

function toNumber(input: string) {
  return Number(input.replace(/\s/g, "").replace(",", "."));
}

/** Exported so it can be unit-tested on its own. */
export function matchBlank(
  rule: FillBlankQuestion["blanks"][number],
  raw: string,
): boolean {
  const input = raw ?? "";
  if (input.trim() === "") return false;

  switch (rule.mode) {
    case "exact":
      return input.trim() === rule.accepted[0];
    case "advanced": {
      const options = { caseSensitive: rule.caseSensitive ?? false, ignoreWhitespace: rule.ignoreWhitespace ?? true };
      const value = normalize(input, options);
      return rule.accepted.some((candidate) => normalize(candidate, options) === value);
    }
    case "numeric": {
      const value = toNumber(input);
      if (!Number.isFinite(value)) return false;
      const tolerance = rule.tolerance ?? 0;
      return rule.accepted.some((candidate) => {
        const target = toNumber(candidate);
        return Number.isFinite(target) && Math.abs(value - target) <= tolerance;
      });
    }
    case "regex": {
      if (!rule.pattern) return false;
      try {
        return new RegExp(rule.pattern, rule.caseSensitive ? "" : "i").test(input.trim());
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

export const scoreFillBlank: Scorer<FillBlankQuestion> = (question, value, rules) => {
  const maxPoints = rules.correct;
  const values = value?.kind === "blanks" ? value.values : {};
  const detail: Record<string, boolean> = {};
  let answered = 0;
  let correctCount = 0;

  for (const blank of question.blanks) {
    const raw = values[blank.id] ?? "";
    const ok = matchBlank(blank, raw);
    detail[blank.id] = ok;
    if (raw.trim() !== "") answered += 1;
    if (ok) correctCount += 1;
  }

  if (answered === 0) return { points: rules.empty, maxPoints, correct: null, detail };

  if (!question.partialScoring) {
    const allCorrect = correctCount === question.blanks.length;
    return { points: allCorrect ? rules.correct : rules.wrong, maxPoints, correct: allCorrect, detail };
  }

  const ratio = correctCount / Math.max(1, question.blanks.length);
  const points = ratio * rules.correct;
  return { points, maxPoints, correct: correctCount === question.blanks.length, detail };
};

/* -------------------------------- 5. essay -------------------------------- */

/** Keyword based auto scoring — used when the essay is not manually graded. */
export function scoreEssayKeywords(question: EssayQuestion, text: string) {
  const haystack = ` ${text.toLowerCase()} `;
  let points = 0;
  const detail: Record<string, boolean> = {};
  for (const keyword of question.keywords) {
    const hit = haystack.includes(keyword.term.toLowerCase());
    detail[keyword.term] = hit;
    if (hit) points += keyword.points;
  }
  return { points: Math.min(points, question.maxScore), detail };
}

export const scoreEssay: Scorer<EssayQuestion> = (question, value, rules) => {
  const maxPoints = question.maxScore || rules.correct;
  const text = value?.kind === "text" ? value.text.trim() : "";
  if (text === "") return { points: 0, maxPoints, correct: null, needsManualGrading: question.manualGrading };

  if (question.manualGrading) {
    return { points: 0, maxPoints, correct: null, needsManualGrading: true };
  }
  const auto = scoreEssayKeywords(question, text);
  return { points: auto.points, maxPoints, correct: null, detail: auto.detail };
};

/* ----------------------------- 6. true / false ---------------------------- */

export const scoreTrueFalse: Scorer<QuestionOf<"true-false">> = (question, value, rules) => {
  if (value?.kind !== "boolean" || value.value === null || value.value === undefined) {
    return { points: rules.empty, maxPoints: rules.correct, correct: null };
  }
  return objective(value, value.value === question.correct, rules, rules.correct);
};

/* -------------------------------- 7. matching ----------------------------- */

export const scoreMatching: Scorer<MatchingQuestion> = (question, value, rules) => {
  const maxPoints = rules.correct;
  const map = value?.kind === "matching" ? value.map : {};
  const answered = Object.keys(map).length;
  if (answered === 0) return { points: rules.empty, maxPoints, correct: null };

  const detail: Record<string, boolean | number> = {};
  let correctCount = 0;
  for (const pair of question.pairs) {
    const ok = map[pair.id] === pair.id;
    detail[pair.id] = ok;
    if (ok) correctCount += 1;
  }

  if (!question.partialScoring) {
    const all = correctCount === question.pairs.length;
    return { points: all ? rules.correct : rules.wrong, maxPoints, correct: all, detail };
  }
  return {
    points: (correctCount / Math.max(1, question.pairs.length)) * rules.correct,
    maxPoints,
    correct: correctCount === question.pairs.length,
    detail,
  };
};

/* ------------------------------- 8. listening ----------------------------- */

export const scoreListening: Scorer<QuestionOf<"listening">> = (question, value, rules) =>
  scoreQuestion(question.inner, value, rules);

/* ------------------------------- 9. ordering ------------------------------ */

export const scoreOrdering: Scorer<OrderingQuestion> = (question, value, rules) => {
  const maxPoints = rules.correct;
  const order = value?.kind === "order" ? value.itemIds : [];
  if (order.length === 0) return { points: rules.empty, maxPoints, correct: null };

  const detail: Record<string, boolean> = {};
  let inPlace = 0;
  question.correctOrder.forEach((id, index) => {
    const ok = order[index] === id;
    detail[id] = ok;
    if (ok) inPlace += 1;
  });

  const exact = inPlace === question.correctOrder.length;
  if (!question.partialScoring) {
    return { points: exact ? rules.correct : rules.wrong, maxPoints, correct: exact, detail };
  }
  return {
    points: (inPlace / Math.max(1, question.correctOrder.length)) * rules.correct,
    maxPoints,
    correct: exact,
    detail,
  };
};

/* ----------------------------- 10. image choice --------------------------- */

export const scoreImageChoice: Scorer<QuestionOf<"image-choice">> = (question, value, rules) =>
  objective(value, choiceValue(value) === question.correctOptionId, rules, rules.correct);

/* -------------------------------- 11. likert ------------------------------ */

/** Profile item: returns the (possibly reversed) scale value, never right/wrong. */
export const scoreLikert: Scorer<LikertQuestion> = (question, value) => {
  const maxPoints = question.max;
  if (value?.kind !== "scale" || !Number.isFinite(value.value)) {
    return { points: 0, maxPoints, correct: null };
  }
  const raw = question.reversed ? question.min + question.max - value.value : value.value;
  return { points: raw, maxPoints, correct: null };
};

/* -------------------------------- 12. group ------------------------------- */

export const scoreGroup: Scorer<QuestionOf<"group">> = (question, value, rules) => {
  const valuesByChild = value?.kind === "group" ? value.values : undefined;
  let points = 0;
  let maxPoints = 0;
  let allCorrect = true;
  let answeredAny = false;
  const detail: Record<string, boolean> = {};

  for (const child of question.children) {
    const childValue = valuesByChild?.[child.id] ?? value;
    const result = scoreQuestion(child, childValue, rules);
    points += result.points;
    maxPoints += result.maxPoints;
    if (isAnswered(childValue)) answeredAny = true;
    detail[child.id] = result.correct === true;
    if (result.correct !== true) allCorrect = false;
  }

  return {
    points,
    maxPoints,
    correct: answeredAny ? allCorrect : null,
    detail,
    needsManualGrading: question.children.some((child) => child.type === "essay"),
  };
};

/* --------------------- 13. kecermatan — karakter hilang -------------------- */

export const scoreKecermatanKarakter: Scorer<QuestionOf<"kecermatan-karakter">> = (question, value, rules) =>
  objective(value, choiceValue(value) === String(question.correctIndex), rules, rules.correct);

/* ----------------------- 14. kecermatan — kraepelin ------------------------ */

export const scoreKraepelin: Scorer<KraepelinQuestion> = (question, value, rules) => {
  const expected = question.correctAnswers;
  const digits = value?.kind === "digits" ? value.digits : [];
  const answeredCount = digits.filter((digit) => digit !== "").length;
  if (answeredCount === 0) {
    return { points: rules.empty, maxPoints: rules.correct * expected.length, correct: null };
  }
  const correctCount = expected.filter((answer, index) => digits[index] === answer).length;
  return {
    points: correctCount * rules.correct,
    maxPoints: rules.correct * expected.length,
    correct: correctCount === expected.length,
    detail: { correctCount, answeredCount },
  };
};

/* ------------------- 15. kecermatan — perbandingan angka ------------------- */

export const scoreKecermatanPerbandingan: Scorer<QuestionOf<"kecermatan-perbandingan">> = (question, value, rules) => {
  const picked = value?.kind === "comparison" ? value.value : null;
  return objective(value, picked === question.correct, rules, rules.correct);
};

/* -------------------------------- registry -------------------------------- */

export const scorers: { [K in QuestionType]: Scorer<QuestionOf<K>> } = {
  "multiple-choice": scoreMultipleChoice,
  "multiple-answer": scoreMultipleAnswer,
  "weighted-choice": scoreWeightedChoice,
  "fill-blank": scoreFillBlank,
  essay: scoreEssay,
  "true-false": scoreTrueFalse,
  matching: scoreMatching,
  listening: scoreListening,
  ordering: scoreOrdering,
  "image-choice": scoreImageChoice,
  likert: scoreLikert,
  group: scoreGroup,
  "kecermatan-karakter": scoreKecermatanKarakter,
  "kecermatan-kraepelin": scoreKraepelin,
  "kecermatan-perbandingan": scoreKecermatanPerbandingan,
};

/**
 * Score a single question. `group` recuses into its children, `listening`
 * delegates to the wrapped question — everything else is handled by its own
 * scorer, so adding a new question type only means adding one registry entry.
 */
export function scoreQuestion(
  question: Question,
  value: AnswerValue | null,
  rules: ScoringRules = { correct: 1, wrong: 0, empty: 0 },
): QuestionScoreResult {
  const scorer = scorers[question.type] as Scorer<Question> | undefined;
  if (!scorer) return { points: 0, maxPoints: 0, correct: null };
  const result = scorer(question, value, rules);
  return { ...result, maxPoints: Math.max(0, result.maxPoints) };
}
