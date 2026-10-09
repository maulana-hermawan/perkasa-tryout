// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ThemeProvider } from "next-themes";
import type { AnswerValue, Question } from "@/types";
import { I18nProvider } from "@/lib/i18n";
import { createSeedDatabase } from "@/lib/seed";
import { generateSubtestQuestions } from "@/lib/exam/generators";
import { describeAnswer, describeCorrectAnswer } from "@/lib/exam/answer-format";
import { QuestionInput } from "./question-input";

const db = createSeedDatabase();

/** One real question per type: seed content plus a generated kecermatan set. */
function questionOfType(type: Question["type"]): Question {
  const found = db.questions.find((question) => question.type === type);
  if (found) return found;
  const generated = db.subtests
    .filter((subtest) => subtest.generator)
    .flatMap((subtest) => generateSubtestQuestions(subtest, `seed-${subtest.id}`));
  const match = generated.find((question) => question.type === type);
  if (!match) throw new Error(`No question of type ${type} in the seed data`);
  return match;
}

const TYPES: Question["type"][] = [
  "multiple-choice",
  "multiple-answer",
  "weighted-choice",
  "fill-blank",
  "essay",
  "true-false",
  "matching",
  "listening",
  "ordering",
  "likert",
  "group",
  "kecermatan-karakter",
  "kecermatan-kraepelin",
  "kecermatan-perbandingan",
];

beforeEach(() => {
  window.localStorage.setItem("tryoutku.locale", "id");
  document.documentElement.lang = "id";
});

afterEach(cleanup);

describe("QuestionInput", () => {
  it.each(TYPES)("renders an input for %s", (type) => {
    const question = questionOfType(type);
    const { container } = render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <I18nProvider initialLocale="id">
          <QuestionInput question={question} value={null} onChange={() => {}} />
        </I18nProvider>
      </ThemeProvider>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("reports the picked option for a multiple choice question", () => {
    const question = questionOfType("multiple-choice");
    if (question.type !== "multiple-choice") throw new Error("unreachable");
    const onChange = vi.fn<(value: AnswerValue | null) => void>();

    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <I18nProvider initialLocale="id">
          <QuestionInput question={question} value={null} onChange={onChange} />
        </I18nProvider>
      </ThemeProvider>,
    );

    const correct = question.options.findIndex((option) => option.id === question.correctOptionId);
    screen.getAllByRole("radio")[correct].click();
    expect(onChange).toHaveBeenCalledWith({ kind: "choice", optionId: question.correctOptionId });
  });

  it("reports every ticked box for a multiple answer question", () => {
    const question = questionOfType("multiple-answer");
    if (question.type !== "multiple-answer") throw new Error("unreachable");
    const onChange = vi.fn<(value: AnswerValue | null) => void>();

    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <I18nProvider initialLocale="id">
          <QuestionInput question={question} value={null} onChange={onChange} />
        </I18nProvider>
      </ThemeProvider>,
    );

    screen.getAllByRole("checkbox")[0].click();
    expect(onChange).toHaveBeenCalledWith({ kind: "choices", optionIds: [question.options[0].id] });
  });

  it("reports the missing character for Tes Kecermatan", () => {
    const question = questionOfType("kecermatan-karakter");
    if (question.type !== "kecermatan-karakter") throw new Error("unreachable");
    const onChange = vi.fn<(value: AnswerValue | null) => void>();

    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <I18nProvider initialLocale="id">
          <QuestionInput question={question} value={null} onChange={onChange} />
        </I18nProvider>
      </ThemeProvider>,
    );

    // The key row is rendered as one button per character.
    const buttons = screen.getAllByRole("radio");
    expect(buttons).toHaveLength(question.keyRow.length);
    buttons[question.correctIndex].click();
    expect(onChange.mock.calls[0]?.[0]).toEqual({ kind: "choice", optionId: String(question.correctIndex) });
  });
});

describe("answer formatting", () => {
  const tx = (value?: { id: string; en?: string }) => value?.id ?? "";

  it("describes a correct multiple choice answer with its letter", () => {
    const question = questionOfType("multiple-choice");
    if (question.type !== "multiple-choice") throw new Error("unreachable");
    const index = question.options.findIndex((option) => option.id === question.correctOptionId);
    const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[index];
    expect(describeCorrectAnswer(question, "id", tx).startsWith(`${letter}.`)).toBe(true);
    expect(describeAnswer(question, { kind: "choice", optionId: question.correctOptionId }, "id", tx)).toBe(
      describeCorrectAnswer(question, "id", tx),
    );
  });

  it("returns an empty string for an unanswered question", () => {
    const question = questionOfType("multiple-choice");
    expect(describeAnswer(question, null, "id", tx)).toBe("");
  });

  it("describes kraepelin answers as a digit string", () => {
    const question = questionOfType("kecermatan-kraepelin");
    if (question.type !== "kecermatan-kraepelin") throw new Error("unreachable");
    expect(describeCorrectAnswer(question, "id", tx)).toBe(question.correctAnswers.join(""));
  });
});
