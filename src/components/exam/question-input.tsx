"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import type {
  AnswerValue,
  ChoiceOption,
  ComparisonOperator,
  EssayQuestion,
  FillBlankQuestion,
  LikertQuestion,
  MatchingQuestion,
  MultipleAnswerQuestion,
  MultipleChoiceQuestion,
  OrderingQuestion,
  Question,
  TrueFalseQuestion,
  WeightedChoiceQuestion,
} from "@/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/common/rich-content";
import { AudioPlayer } from "@/components/exam/audio-player";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/exam/native-select";
import { Textarea } from "@/components/ui/textarea";

export interface QuestionInputProps {
  question: Question;
  value: AnswerValue | null;
  onChange: (value: AnswerValue | null) => void;
  disabled?: boolean;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* ------------------------------- primitives ------------------------------- */

function OptionRow({
  option,
  letter,
  selected,
  onSelect,
  disabled,
  multiple,
  trailing,
}: {
  option: ChoiceOption;
  letter?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  multiple?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected
          ? "border-primary bg-primary/5 shadow-card"
          : "border-border bg-card hover:bg-accent/40 active:bg-accent/60",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground",
        )}
      >
        {multiple ? selected ? <Check className="size-4" /> : null : letter}
      </span>
      <span className="min-w-0 flex-1">
        {option.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={option.imageUrl} alt="" className="mb-2 max-h-40 rounded-lg object-contain" />
        )}
        <RichContent content={option.content} dense />
      </span>
      {trailing}
    </button>
  );
}

/* ------------------------------- 1. choice -------------------------------- */

function ChoiceInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: MultipleChoiceQuestion | WeightedChoiceQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const selectedId = value?.kind === "choice" ? value.optionId : null;

  return (
    <div role="radiogroup" className="space-y-2">
      {question.options.map((option, index) => (
        <OptionRow
          key={option.id}
          option={option}
          letter={LETTERS[index] ?? String(index + 1)}
          selected={selectedId === option.id}
          disabled={disabled}
          onSelect={() => onChange({ kind: "choice", optionId: option.id })}
          trailing={
            question.type === "weighted-choice" && typeof option.weight === "number" ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{option.weight}</span>
            ) : null
          }
        />
      ))}
    </div>
  );
}

/* ---------------------------- 2. multiple answer -------------------------- */

function MultipleAnswerInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: MultipleAnswerQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const selected = value?.kind === "choices" ? value.optionIds : [];

  function toggle(optionId: string) {
    const next = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    onChange({ kind: "choices", optionIds: next });
  }

  return (
    <div className="space-y-2">
      {question.options.map((option, index) => (
        <OptionRow
          key={option.id}
          option={option}
          letter={LETTERS[index] ?? String(index + 1)}
          multiple
          selected={selected.includes(option.id)}
          disabled={disabled}
          onSelect={() => toggle(option.id)}
        />
      ))}
    </div>
  );
}

/* ------------------------------ 3. true/false ----------------------------- */

function TrueFalseInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: TrueFalseQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const current = value?.kind === "boolean" ? value.value : null;
  const options: { label: string; flag: boolean }[] =
    question.variant === "yes-no"
      ? [
          { label: t("exam.yesLabel"), flag: true },
          { label: t("exam.noLabel"), flag: false },
        ]
      : [
          { label: t("exam.trueLabel"), flag: true },
          { label: t("exam.falseLabel"), flag: false },
        ];

  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={current === option.flag}
          disabled={disabled}
          onClick={() => onChange({ kind: "boolean", value: option.flag })}
          className={cn(
            "min-h-16 rounded-xl border text-sm font-semibold transition-colors",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            current === option.flag
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-accent",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- 4. blanks -------------------------------- */

const BLANK_PATTERN = /\{\{(\w+)\}\}/g;

function FillBlankInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: FillBlankQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const { t, tx } = useI18n();
  const values = value?.kind === "blanks" ? value.values : {};
  const parts = useMemo(() => tx(question.template).split(BLANK_PATTERN), [question.template, tx]);

  return (
    <div className="space-y-3">
      <div className="rich-content text-[0.95rem] leading-relaxed">
        {parts.map((part, index) =>
          index % 2 === 1 ? (
            <BlankField
              key={`${part}-${index}`}
              question={question}
              blankId={part}
              values={values}
              onChange={onChange}
              disabled={disabled}
              label={t("exam.blankLabel", { index: Math.floor(index / 2) + 1 })}
            />
          ) : (
            <RichContent key={`text-${index}`} content={part} />
          ),
        )}
      </div>
    </div>
  );
}

function BlankField({
  question,
  blankId,
  values,
  onChange,
  disabled,
  label,
}: {
  question: FillBlankQuestion;
  blankId: string;
  values: Record<string, string>;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
  label: string;
}) {
  const rule = question.blanks.find((item) => item.id === blankId);

  if (rule?.input === "dropdown") {
    return (
      <NativeSelect
        ariaLabel={label}
        disabled={disabled}
        className="mx-1"
        value={values[blankId] ?? ""}
        onValueChange={(next) => onChange({ kind: "blanks", values: { ...values, [blankId]: next } })}
        options={(rule.choices ?? []).map((choice) => ({ value: choice, label: choice }))}
      />
    );
  }

  return (
    <Input
      aria-label={label}
      disabled={disabled}
      value={values[blankId] ?? ""}
      inputMode={rule?.mode === "numeric" ? "decimal" : "text"}
      onChange={(event) => onChange({ kind: "blanks", values: { ...values, [blankId]: event.target.value } })}
      className="mx-1 inline-flex h-9 w-28 text-center"
    />
  );
}

/* -------------------------------- 5. essay -------------------------------- */

function EssayInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: EssayQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const text = value?.kind === "text" ? value.text : "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const tooShort = typeof question.minWords === "number" && words < question.minWords;

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        disabled={disabled}
        onChange={(event) => onChange({ kind: "text", text: event.target.value })}
        rows={question.length === "long" ? 10 : 5}
        placeholder={t("exam.yourAnswer")}
      />
      <div className="flex items-center justify-between text-xs">
        <span className={cn("text-muted-foreground", tooShort && "text-warning-foreground")}>
          {typeof question.minWords === "number" && question.minWords > 0
            ? `${t("exam.essayWords", { count: words })} · ${t("exam.essayMinWords", { count: question.minWords })}`
            : t("exam.essayWords", { count: words })}
        </span>
        <span className="text-muted-foreground">
          {t("result.score")}: {question.maxScore}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------- 6. likert -------------------------------- */

function LikertInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: LikertQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const { t, tx } = useI18n();
  const current = value?.kind === "scale" ? value.value : null;
  const steps = Array.from({ length: question.max - question.min + 1 }, (_, index) => question.min + index);

  return (
    <div className="space-y-3">
      <RichContent content={question.statement} />
      <div className="flex gap-1.5" role="radiogroup" aria-label={t("exam.scaleLabel")}>
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={current === step}
            disabled={disabled}
            onClick={() => onChange({ kind: "scale", value: step })}
            className={cn(
              "flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              current === step
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent",
            )}
          >
            {step}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{tx(question.minLabel)}</span>
        <span>{tx(question.maxLabel)}</span>
      </div>
    </div>
  );
}

/* ------------------------------- 7. matching ------------------------------ */

function MatchingInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: MatchingQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const { t, tx } = useI18n();
  const map = value?.kind === "matching" ? value.map : {};

  return (
    <div className="space-y-2">
      {question.pairs.map((pair) => (
        <div key={pair.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-border p-2">
          <div className="min-w-0">
            <RichContent content={pair.left} dense />
          </div>
          <NativeSelect
            ariaLabel={t("exam.matchingLabel", { left: tx(pair.left).slice(0, 24) })}
            disabled={disabled}
            className="w-32"
            value={map[pair.id] ?? ""}
            onValueChange={(next) => onChange({ kind: "matching", map: { ...map, [pair.id]: next } })}
            options={[
              ...question.pairs.map((option) => ({ value: option.id, label: tx(option.right) })),
              ...question.distractors.map((option, index) => ({
                value: `__distractor-${index}`,
                label: tx(option),
              })),
            ]}
          />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- 8. ordering ------------------------------ */

function OrderingInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: OrderingQuestion;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const order = value?.kind === "order" ? value.itemIds : [];
  const positions = question.items.map((_, index) => index + 1);

  function setPosition(itemId: string, position: number) {
    const next = [...order];
    const currentIndex = next.indexOf(itemId);
    if (currentIndex >= 0) next.splice(currentIndex, 1);
    next.splice(position - 1, 0, itemId);
    onChange({ kind: "order", itemIds: next });
  }

  return (
    <div className="space-y-2">
      {question.items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
          <span className="min-w-0 flex-1">
            <RichContent content={item.content} dense />
          </span>
          <NativeSelect
            ariaLabel={t("exam.orderLabel", { index: index + 1 })}
            disabled={disabled}
            className="w-20"
            value={order.indexOf(item.id) >= 0 ? String(order.indexOf(item.id) + 1) : ""}
            onValueChange={(next) => setPosition(item.id, Number(next))}
            options={positions.map((position) => ({ value: String(position), label: String(position) }))}
          />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ 9. comparison ----------------------------- */

const OPERATORS: ComparisonOperator[] = ["<", ">", "="];

export function ComparisonInput({
  value,
  onChange,
  disabled,
  labels = { lessThan: "<", greaterThan: ">", equalTo: "=" },
}: {
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
  labels?: { lessThan: string; greaterThan: string; equalTo: string };
}) {
  const current = value?.kind === "comparison" ? value.value : null;
  const options: { operator: ComparisonOperator; label: string }[] = [
    { operator: "<", label: labels.lessThan },
    { operator: ">", label: labels.greaterThan },
    { operator: "=", label: labels.equalTo },
  ];

  return (
    <div className="flex gap-1.5" role="radiogroup">
      {options
        .filter((option) => OPERATORS.includes(option.operator))
        .map((option) => (
          <button
            key={option.operator}
            type="button"
            role="radio"
            aria-checked={current === option.operator}
            disabled={disabled}
            onClick={() => onChange({ kind: "comparison", value: option.operator })}
            className={cn(
              "min-w-12 flex-1 rounded-lg border py-2 text-lg font-bold transition-colors",
              current === option.operator
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent",
            )}
          >
            {option.operator}
          </button>
        ))}
    </div>
  );
}

/* ------------------------------- dispatcher ------------------------------- */

/**
 * Renders the input for one question and reports the answer upward.
 *
 * `listening` delegates to its wrapped question, `group` renders one input per
 * child — both keep the answer under the parent question id, matching the
 * scorers in `src/lib/scoring`.
 */
export function QuestionInput({ question, value, onChange, disabled }: QuestionInputProps) {
  const { t } = useI18n();

  switch (question.type) {
    case "multiple-choice":
    case "weighted-choice":
    case "image-choice":
      return (
        <ChoiceInput
          question={question as MultipleChoiceQuestion | WeightedChoiceQuestion}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "multiple-answer":
      return <MultipleAnswerInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    case "true-false":
      return <TrueFalseInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    case "fill-blank":
      return <FillBlankInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    case "essay":
      return <EssayInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    case "likert":
      return <LikertInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    case "matching":
      return <MatchingInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    case "ordering":
      return <OrderingInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    case "listening":
      return (
        <div className="space-y-3">
          <AudioPlayer
            src={question.audioUrl}
            maxPlays={question.maxPlays}
            allowSeek={question.allowSeek}
            transcript={question.transcript}
          />
          <QuestionInput question={question.inner} value={value} onChange={onChange} disabled={disabled} />
        </div>
      );

    case "group": {
      const values = value?.kind === "group" ? value.values : {};
      return (
        <div className="space-y-4">
          {question.stimulus.kind === "text" && (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <RichContent content={question.stimulus.content} dense />
            </div>
          )}
          {question.stimulus.kind === "audio" && (
            <AudioPlayer
              src={question.stimulus.audioUrl}
              maxPlays={question.stimulus.maxPlays}
              allowSeek={question.stimulus.allowSeek}
              transcript={question.stimulus.transcript}
            />
          )}
          {question.stimulus.kind === "image" && (
            <div className="rounded-xl border border-border bg-muted/40 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={question.stimulus.imageUrl} alt="" className="mx-auto max-h-64 rounded-lg object-contain" />
              {question.stimulus.caption && (
                <RichContent content={question.stimulus.caption} dense className="mt-2 text-center text-xs" />
              )}
            </div>
          )}
          {question.children.map((child, childIndex) => (
            <div key={child.id} className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("exam.questionLabel", { number: childIndex + 1, total: question.children.length }).replace(
                  / \/ \d+$/,
                  "",
                )}
              </p>
              <RichContent content={child.prompt} />
              <QuestionInput
                question={child}
                value={values[child.id] ?? null}
                disabled={disabled}
                onChange={(childValue) =>
                  onChange({ kind: "group", values: { ...values, [child.id]: childValue } })
                }
              />
            </div>
          ))}
        </div>
      );
    }

    case "kecermatan-karakter":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-1.5 rounded-xl bg-muted/50 p-3">
            {question.shown.map((character, itemIndex) => (
              <span
                key={`${character}-${itemIndex}`}
                className="flex size-11 items-center justify-center rounded-lg border border-border bg-background text-xl font-bold"
              >
                {character}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {question.keyRow.map((character, itemIndex) => (
              <button
                key={`${character}-${itemIndex}`}
                type="button"
                role="radio"
                aria-checked={value?.kind === "choice" && value.optionId === String(itemIndex)}
                disabled={disabled}
                onClick={() => onChange({ kind: "choice", optionId: String(itemIndex) })}
                className={cn(
                  "flex size-11 items-center justify-center rounded-lg border text-lg font-bold transition-colors",
                  value?.kind === "choice" && value.optionId === String(itemIndex)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                {character}
              </button>
            ))}
          </div>
        </div>
      );

    case "kecermatan-perbandingan":
      return (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 rounded-lg bg-muted/60 p-2 text-center text-lg font-semibold tabular-nums">
            {question.left}
          </span>
          <div className="w-32 shrink-0">
            <ComparisonInput
              value={value}
              onChange={onChange}
              disabled={disabled}
              labels={{
                lessThan: t("exam.lessThan"),
                greaterThan: t("exam.greaterThan"),
                equalTo: t("exam.equalTo"),
              }}
            />
          </div>
          <span className="min-w-0 flex-1 rounded-lg bg-muted/60 p-2 text-center text-lg font-semibold tabular-nums">
            {question.right}
          </span>
        </div>
      );

    case "kecermatan-kraepelin":
      return <KraepelinInput question={question} value={value} onChange={onChange} disabled={disabled} />;

    default:
      return null;
  }
}

/* ------------------------------ kraepelin --------------------------------- */

function KraepelinInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: Extract<Question, { type: "kecermatan-kraepelin" }>;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const digits = value?.kind === "digits" ? value.digits : [];
  const slots = question.correctAnswers.length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("exam.digitHint")}</p>
      <div className="flex flex-col gap-1">
        {question.rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-base font-semibold tabular-nums">
              {row}
            </span>
            {index < slots && (
              <Input
                aria-label={`${index + 1}`}
                disabled={disabled}
                inputMode="numeric"
                maxLength={1}
                value={digits[index] ?? ""}
                onChange={(event) => {
                  const next = Array.from({ length: slots }, (_, position) => digits[position] ?? "");
                  next[index] = event.target.value.replace(/[^0-9]/g, "").slice(-1);
                  onChange({ kind: "digits", digits: next });
                }}
                className="h-9 w-12 text-center text-base font-semibold tabular-nums"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuestionInput;
