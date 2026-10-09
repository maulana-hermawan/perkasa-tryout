"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { dataSource } from "@/lib/repositories";
import { useDatabase } from "@/lib/store/db";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { RichContent } from "@/components/common/rich-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/exam/native-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { plainText } from "@/lib/exam/answer-format";
import { uid } from "@/lib/utils";
import type { ChoiceOption, Difficulty, EssayQuestion, Question, QuestionType } from "@/types";

const EDITABLE_TYPES: QuestionType[] = ["multiple-choice", "multiple-answer", "true-false", "fill-blank", "essay"];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface OptionDraft {
  id: string;
  content: string;
}

interface FormState {
  type: QuestionType;
  subtestId: string;
  difficulty: Difficulty;
  topics: string;
  prompt: string;
  explanation: string;
  options: OptionDraft[];
  correctIndex: number;
  correctBoolean: boolean;
  acceptedAnswers: string;
  maxScore: string;
  minWords: string;
  manualGrading: boolean;
  keywords: { id: string; term: string; points: string }[];
}

const emptyForm = (subtestId: string): FormState => ({
  type: "multiple-choice",
  subtestId,
  difficulty: "medium",
  topics: "",
  prompt: "",
  explanation: "",
  options: [
    { id: uid("opt"), content: "" },
    { id: uid("opt"), content: "" },
    { id: uid("opt"), content: "" },
    { id: uid("opt"), content: "" },
  ],
  correctIndex: 0,
  correctBoolean: true,
  acceptedAnswers: "",
  maxScore: "10",
  minWords: "50",
  manualGrading: true,
  keywords: [],
});

function toForm(question: Question): FormState {
  const base = emptyForm(question.subtestId);
  const form: FormState = {
    ...base,
    type: question.type,
    subtestId: question.subtestId,
    difficulty: question.difficulty,
    topics: question.topics.join(", "),
    prompt: question.prompt.id,
    explanation: question.explanation?.id ?? "",
  };

  if (question.type === "multiple-choice" || question.type === "multiple-answer") {
    form.options = question.options.map((option) => ({ id: option.id, content: option.content.id }));
    form.correctIndex = Math.max(
      0,
      question.options.findIndex((option) =>
        question.type === "multiple-choice"
          ? option.id === question.correctOptionId
          : question.correctOptionIds.includes(option.id),
      ),
    );
  }
  if (question.type === "true-false") form.correctBoolean = question.correct;
  if (question.type === "fill-blank") {
    form.prompt = question.template.id;
    form.acceptedAnswers = question.blanks.map((blank) => blank.accepted.join(";")).join(" || ");
  }
  if (question.type === "essay") {
    form.maxScore = String(question.maxScore);
    form.minWords = String(question.minWords ?? 50);
    form.manualGrading = question.manualGrading;
    form.keywords = question.keywords.map((keyword) => ({
      id: uid("key"),
      term: keyword.term,
      points: String(keyword.points),
    }));
  }
  return form;
}

/**
 * Authoring form for the question bank.
 *
 * Covers the types an admin actually writes by hand; the generated
 * (Tes Kecermatan) and composite types stay seed-only for now.
 */
export function QuestionForm({ question }: { question?: Question }) {
  const { t, tx } = useI18n();
  const router = useRouter();
  const db = useDatabase();

  const [form, setForm] = useState<FormState>(() => (question ? toForm(question) : emptyForm("")));
  const [pending, setPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const patch = (values: Partial<FormState>) => setForm((current) => ({ ...current, ...values }));

  const subtests = useMemo(
    () =>
      [...db.subtests]
        .sort((a, b) => {
          const aType = db.testTypes.find((type) => type.id === a.testTypeId)?.order ?? 0;
          const bType = db.testTypes.find((type) => type.id === b.testTypeId)?.order ?? 0;
          return aType - bType || a.order - b.order;
        })
        .map((subtest) => ({
          value: subtest.id,
          label: `${tx(db.testTypes.find((type) => type.id === subtest.testTypeId)?.name)} — ${tx(subtest.name)}`,
        })),
    [db.subtests, db.testTypes, tx],
  );

  const promptPlain = plainText(form.prompt).trim();
  const canSave = Boolean(promptPlain) && Boolean(form.subtestId) && !pending;

  async function handleSave() {
    if (!canSave) {
      toast.error(t("admin.editor.required"));
      return;
    }
    setPending(true);
    try {
      const now = new Date().toISOString();
      const selectedSubtest = db.subtests.find((item) => item.id === form.subtestId);
      const shared = {
        subtestId: form.subtestId,
        testTypeId: selectedSubtest?.testTypeId ?? "",
        difficulty: form.difficulty,
        topics: form.topics
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean),
        tags: [] as string[],
        prompt: { id: form.prompt, en: form.prompt },
        explanation: form.explanation ? { id: form.explanation, en: form.explanation } : undefined,
        updatedAt: now,
      };

      const options: ChoiceOption[] = form.options
        .filter((option) => plainText(option.content).trim().length > 0 || option.content.trim().length > 0)
        .map((option) => ({ id: option.id, content: { id: option.content, en: option.content } }));
      const correctOption = options[Math.min(form.correctIndex, Math.max(0, options.length - 1))];

      const payload = ((): Question => {
        switch (form.type) {
          case "true-false":
            return {
              id: question?.id ?? uid("q"),
              type: "true-false",
              variant: "true-false",
              correct: form.correctBoolean,
              createdAt: question?.createdAt ?? now,
              ...shared,
            };
          case "multiple-answer":
            return {
              id: question?.id ?? uid("q"),
              type: "multiple-answer",
              options,
              correctOptionIds: correctOption ? [correctOption.id] : [],
              partialScoring: true,
              createdAt: question?.createdAt ?? now,
              ...shared,
            };
          case "fill-blank":
            return {
              id: question?.id ?? uid("q"),
              type: "fill-blank",
              template: { id: form.prompt, en: form.prompt },
              blanks: form.acceptedAnswers
                .split("||")
                .map((group, index) => ({
                  id: `b${index + 1}`,
                  accepted: group
                    .split(";")
                    .map((answer) => answer.trim().toLowerCase())
                    .filter(Boolean),
                  caseSensitive: false,
                  input: "text" as const,
                  mode: "advanced" as const,
                }))
                .filter((blank) => blank.accepted.length > 0),
              partialScoring: true,
              createdAt: question?.createdAt ?? now,
              ...shared,
            };
          case "essay":
            return {
              id: question?.id ?? uid("q"),
              type: "essay",
              length: Number(form.minWords) > 120 ? "long" : "short",
              maxScore: Math.max(1, Number(form.maxScore) || 1),
              keywords: form.keywords
                .filter((keyword) => keyword.term.trim())
                .map((keyword) => ({ term: keyword.term.trim(), points: Number(keyword.points) || 1 })),
              rubric: question?.type === "essay" ? question.rubric : [],
              minWords: Number(form.minWords) || undefined,
              manualGrading: form.manualGrading,
              createdAt: question?.createdAt ?? now,
              ...shared,
            } satisfies EssayQuestion;
          default:
            return {
              id: question?.id ?? uid("q"),
              type: "multiple-choice",
              options,
              correctOptionId: correctOption?.id ?? "",
              shuffleOptions: true,
              createdAt: question?.createdAt ?? now,
              ...shared,
            };
        }
      })();

      if (question) await dataSource.questions.update(question.id, payload);
      else await dataSource.questions.create(payload);

      toast.success(question ? t("admin.editor.updateToast") : t("admin.editor.createToast"));
      router.push("/admin/bank-soal");
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label={t("common.back")} onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {question ? t("admin.editor.edit") : t("admin.editor.new")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("admin.editor.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPreview((value) => !value)}>
          <Eye className="size-4" />
          {t("admin.editor.preview")}
        </Button>
      </div>

      {/* Meta */}
      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="q-type">{t("admin.editor.type")}</Label>
          <NativeSelect
            ariaLabel={t("admin.editor.type")}
            className="h-11 w-full text-sm"
            value={form.type}
            onValueChange={(value) => patch({ type: value as QuestionType })}
            options={EDITABLE_TYPES.map((type) => ({ value: type, label: type }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-subtest">{t("admin.editor.subtest")}</Label>
          <NativeSelect
            ariaLabel={t("admin.editor.subtest")}
            className="h-11 w-full text-sm"
            value={form.subtestId}
            onValueChange={(value) => patch({ subtestId: value })}
            options={[{ value: "", label: "—" }, ...subtests]}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-difficulty">{t("admin.editor.difficulty")}</Label>
          <NativeSelect
            ariaLabel={t("admin.editor.difficulty")}
            className="h-11 w-full text-sm"
            value={form.difficulty}
            onValueChange={(value) => patch({ difficulty: value as Difficulty })}
            options={DIFFICULTIES.map((item) => ({ value: item, label: t(`admin.questions.${item}`) }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-topics">{t("admin.editor.topics")}</Label>
          <Input
            id="q-topics"
            value={form.topics}
            onChange={(event) => patch({ topics: event.target.value })}
            placeholder="Matematika, Aljabar"
          />
        </div>
      </section>

      {/* Prompt */}
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <Label>{t("admin.editor.prompt")}</Label>
        <RichTextEditor
          value={form.prompt}
          onChange={(html) => patch({ prompt: html })}
          placeholder={t("admin.editor.promptPlaceholder")}
          ariaLabel={t("admin.editor.prompt")}
        />
        {form.type === "fill-blank" && (
          <p className="text-xs text-muted-foreground">
            {t("admin.editor.acceptedAnswers")}
            <span className="font-mono"> · a || b;c</span>
          </p>
        )}
      </section>

      {/* Type-specific fields */}
      {(form.type === "multiple-choice" || form.type === "multiple-answer") && (
        <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("admin.editor.options")}</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => patch({ options: [...form.options, { id: uid("opt"), content: "" }] })}
            >
              <Plus className="size-4" />
              {t("admin.editor.addOption")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("admin.editor.correctOptionHint")}</p>

          <ul className="space-y-2">
            {form.options.map((option, index) => (
              <li key={option.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => patch({ correctIndex: index })}
                  aria-label={`${t("admin.editor.correctOption")} ${index + 1}`}
                  aria-pressed={form.correctIndex === index}
                  className={
                    form.correctIndex === index
                      ? "mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-success text-xs font-bold text-success-foreground"
                      : "mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-xs font-bold text-muted-foreground"
                  }
                >
                  {String.fromCharCode(65 + index)}
                </button>
                <div className="min-w-0 flex-1">
                  <RichTextEditor
                    dense
                    value={option.content}
                    onChange={(html) =>
                      patch({
                        options: form.options.map((item) =>
                          item.id === option.id ? { ...item, content: html } : item,
                        ),
                      })
                    }
                    placeholder={`${t("admin.editor.optionPlaceholder")} ${String.fromCharCode(65 + index)}`}
                    ariaLabel={`${t("admin.editor.optionPlaceholder")} ${String.fromCharCode(65 + index)}`}
                  />
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="mt-1"
                  aria-label={t("admin.editor.removeOption")}
                  disabled={form.options.length <= 2}
                  onClick={() =>
                    patch({
                      options: form.options.filter((item) => item.id !== option.id),
                      correctIndex: Math.min(form.correctIndex, form.options.length - 2),
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {form.type === "true-false" && (
        <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <Label>{t("admin.editor.correctBoolean")}</Label>
          <div className="flex gap-2">
            {[true, false].map((value) => (
              <Button
                key={String(value)}
                type="button"
                variant={form.correctBoolean === value ? "default" : "outline"}
                className="flex-1"
                onClick={() => patch({ correctBoolean: value })}
              >
                {value ? t("admin.editor.trueLabel") : t("admin.editor.falseLabel")}
              </Button>
            ))}
          </div>
        </section>
      )}

      {form.type === "fill-blank" && (
        <section className="space-y-1.5 rounded-2xl border border-border bg-card p-4">
          <Label htmlFor="q-accepted">{t("admin.editor.acceptedAnswers")}</Label>
          <Input
            id="q-accepted"
            value={form.acceptedAnswers}
            onChange={(event) => patch({ acceptedAnswers: event.target.value })}
            placeholder="Jakarta || ibu kota; ibukota"
          />
        </section>
      )}

      {form.type === "essay" && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="q-max">{t("admin.editor.maxScore")}</Label>
              <Input
                id="q-max"
                inputMode="numeric"
                value={form.maxScore}
                onChange={(event) => patch({ maxScore: event.target.value.replace(/[^0-9]/g, "") })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-min">{t("admin.editor.minWords")}</Label>
              <Input
                id="q-min"
                inputMode="numeric"
                value={form.minWords}
                onChange={(event) => patch({ minWords: event.target.value.replace(/[^0-9]/g, "") })}
              />
            </div>
          </div>

          <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
            <span className="text-sm">{t("admin.editor.manualGrading")}</span>
            <Switch
              checked={form.manualGrading}
              onCheckedChange={(value) => patch({ manualGrading: value })}
              aria-label={t("admin.editor.manualGrading")}
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("admin.editor.keywords")}</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({ keywords: [...form.keywords, { id: uid("key"), term: "", points: "2" }] })
                }
              >
                <Plus className="size-4" />
                {t("admin.editor.addKeyword")}
              </Button>
            </div>
            {form.keywords.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("admin.editor.empty")}</p>
            ) : (
              <ul className="space-y-2">
                {form.keywords.map((keyword) => (
                  <li key={keyword.id} className="flex items-center gap-2">
                    <Input
                      value={keyword.term}
                      onChange={(event) =>
                        patch({
                          keywords: form.keywords.map((item) =>
                            item.id === keyword.id ? { ...item, term: event.target.value } : item,
                          ),
                        })
                      }
                      placeholder={t("admin.editor.keywordTerm")}
                      className="flex-1"
                      aria-label={t("admin.editor.keywordTerm")}
                    />
                    <Input
                      inputMode="numeric"
                      value={keyword.points}
                      onChange={(event) =>
                        patch({
                          keywords: form.keywords.map((item) =>
                            item.id === keyword.id
                              ? { ...item, points: event.target.value.replace(/[^0-9]/g, "") }
                              : item,
                          ),
                        })
                      }
                      className="w-20"
                      aria-label={t("admin.editor.keywordPoints")}
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("common.delete")}
                      onClick={() => patch({ keywords: form.keywords.filter((item) => item.id !== keyword.id) })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Explanation */}
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <Label>{t("admin.editor.explanation")}</Label>
        <RichTextEditor
          value={form.explanation}
          onChange={(html) => patch({ explanation: html })}
          placeholder={t("admin.editor.explanationPlaceholder")}
          ariaLabel={t("admin.editor.explanation")}
        />
      </section>

      {showPreview && (
        <section className="space-y-2 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <Badge variant="muted">{t("admin.editor.preview")}</Badge>
          <RichContent content={{ id: form.prompt, en: form.prompt }} />
          {form.type === "multiple-choice" && (
            <ul className="space-y-1 text-sm">
              {form.options.map((option, index) => (
                <li
                  key={option.id}
                  className={
                    form.correctIndex === index
                      ? "rounded-lg bg-success/10 px-2 py-1 font-medium text-success-foreground"
                      : "px-2 py-1 text-muted-foreground"
                  }
                >
                  {String.fromCharCode(65 + index)}. {plainText(option.content).trim() || "—"}
                </li>
              ))}
            </ul>
          )}
          {form.explanation && (
            <>
              <Separator />
              <RichContent content={{ id: form.explanation, en: form.explanation }} dense />
            </>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/admin/bank-soal")}>
          {t("common.cancel")}
        </Button>
        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={!canSave}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {t("admin.editor.create")}
        </Button>
      </div>
    </div>
  );
}

export default QuestionForm;
