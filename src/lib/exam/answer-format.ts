import type { AnswerValue, I18nText, Locale, Question } from "@/types";
import { textOf } from "@/types";
import { scoreQuestion } from "@/lib/scoring";

/**
 * Human readable rendering of an answer — used by the review screen ("your
 * answer" vs "answer key") and by the admin's manual grading queue.
 */

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Strips HTML so an option can be shown in a table cell. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

type Tx = (value?: I18nText) => string;

function optionLabel(question: Question, optionId: string, tx: Tx, locale: Locale): string {
  if (question.type !== "multiple-choice" && question.type !== "multiple-answer" && question.type !== "weighted-choice" && question.type !== "image-choice") {
    return optionId;
  }
  const index = question.options.findIndex((option) => option.id === optionId);
  if (index < 0) return optionId;
  const letter = LETTERS[index] ?? String(index + 1);
  const content = plainText(textOf(question.options[index].content, locale));
  return content ? `${letter}. ${content}` : letter;
}

export function describeAnswer(question: Question, value: AnswerValue | null, locale: Locale, tx: Tx): string {
  if (!value) return "";

  switch (value.kind) {
    case "choice":
      if (question.type === "kecermatan-karakter") return question.keyRow[Number(value.optionId)] ?? "";
      return optionLabel(question, value.optionId, tx, locale);
    case "choices":
      return value.optionIds.map((id) => optionLabel(question, id, tx, locale)).join(", ");
    case "blanks":
      return Object.values(value.values)
        .map((entry) => entry || "—")
        .join(" · ");
    case "text":
      return value.text;
    case "boolean":
      return String(value.value);
    case "matching":
      if (question.type !== "matching") return "";
      return Object.entries(value.map)
        .map(([, rightId]) => {
          const pair = question.pairs.find((item) => item.id === rightId);
          return pair ? plainText(textOf(pair.right, locale)) : "—";
        })
        .join(", ");
    case "order":
      if (question.type !== "ordering") return "";
      return value.itemIds
        .map((id) => {
          const item = question.items.find((entry) => entry.id === id);
          return item ? plainText(textOf(item.content, locale)) : "—";
        })
        .map((label, index) => `${index + 1}. ${label}`)
        .join(", ");
    case "scale":
      return String(value.value);
    case "digits":
      return value.digits.join("");
    case "comparison":
      return value.value;
    case "group":
      if (question.type !== "group") return "";
      return Object.entries(value.values)
        .map(([childId, childValue]) => {
          const child = question.children.find((item) => item.id === childId);
          return child ? describeAnswer(child, childValue, locale, tx) : "";
        })
        .filter(Boolean)
        .join(" · ");
    default:
      return "";
  }
}

/** The expected answer, used as the "kunci jawaban" on the review screen. */
export function describeCorrectAnswer(question: Question, locale: Locale, tx: Tx): string {
  switch (question.type) {
    case "multiple-choice":
    case "image-choice":
      return optionLabel(question, question.correctOptionId, tx, locale);
    case "multiple-answer":
      return question.correctOptionIds.map((id) => optionLabel(question, id, tx, locale)).join(", ");
    case "weighted-choice":
      return question.targetOptionId ? optionLabel(question, question.targetOptionId, tx, locale) : "";
    case "true-false":
      return String(question.correct);
    case "fill-blank":
      return question.blanks
        .map((blank) => blank.label ?? blank.accepted[0] ?? "—")
        .join(" · ");
    case "matching":
      return question.pairs.map((pair) => plainText(textOf(pair.right, locale))).join(", ");
    case "ordering":
      return question.correctOrder
        .map((id, index) => {
          const item = question.items.find((entry) => entry.id === id);
          return item ? `${index + 1}. ${plainText(textOf(item.content, locale))}` : "—";
        })
        .join(", ");
    case "listening":
      return describeCorrectAnswer(question.inner, locale, tx);
    case "kecermatan-karakter":
      return question.keyRow[question.correctIndex] ?? "";
    case "kecermatan-kraepelin":
      return question.correctAnswers.join("");
    case "kecermatan-perbandingan":
      return question.correct;
    case "essay":
      return "";
    case "likert":
      return "";
    case "group":
      return question.children
        .map((child, index) => `${index + 1}. ${describeCorrectAnswer(child, locale, tx)}`)
        .filter((entry) => !entry.endsWith(". "))
        .join(" · ");
    default:
      return "";
  }
}

/** `true` correct, `false` wrong, `null` not answered / not objectively scored. */
export function isAnswerCorrect(question: Question, value: AnswerValue | null): boolean | null {
  return scoreQuestion(question, value, { correct: 1, wrong: 0, empty: 0 }).correct;
}
