"use client";

import { Brain, Eye, ListOrdered } from "lucide-react";
import type { AnswerRecord, AnswerValue, Question } from "@/types";
import { useI18n } from "@/lib/i18n";
import { formatDurationClock } from "@/lib/utils";
import type { ColumnInfo } from "@/lib/exam/use-exam-engine";
import { QuestionInput } from "@/components/exam/question-input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/** Seconds the key row stays visible before it is hidden. */
const MEMORIZE_SECONDS = 5;

/**
 * Tes Kecermatan is column based: one column is on screen at a time and
 * advances automatically when its slice of the subtest timer runs out.
 *
 * The active column is derived from the elapsed time (not from local state) so
 * a refresh resumes in the right column.
 */
export function KecermatanStage({
  questions,
  column,
  answers,
  onAnswer,
  disabled,
}: {
  questions: Record<string, Question>;
  column: ColumnInfo | null;
  answers: Record<string, AnswerRecord>;
  onAnswer: (questionId: string, value: AnswerValue | null) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  if (!column) return null;

  const columnQuestions = column.ids.map((id) => questions[id]).filter((item): item is Question => Boolean(item));
  const first = columnQuestions[0];
  const isKarakter = first?.type === "kecermatan-karakter";
  const memorizing = isKarakter && column.remaining > column.secondsPerColumn - MEMORIZE_SECONDS;
  const keyRow = isKarakter && first?.type === "kecermatan-karakter" ? first.keyRow : null;
  const Icon = first?.type === "kecermatan-kraepelin" ? ListOrdered : first?.type === "kecermatan-perbandingan" ? Brain : Eye;

  const progress = column.secondsPerColumn > 0 ? (column.remaining / column.secondsPerColumn) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 space-y-2 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon className="size-4" />
            {t("exam.columnOf", { index: column.index + 1, total: column.total })}
          </span>
          <span className={column.remaining <= 10 ? "text-destructive" : "text-muted-foreground"} />
          <Badge variant={column.remaining <= 10 ? "destructive" : "muted"}>
            {formatDurationClock(column.remaining)}
          </Badge>
        </div>
        <Progress
          value={progress}
          aria-label={t("exam.columnTime")}
          indicatorClassName={column.remaining <= 10 ? "bg-destructive" : undefined}
        />
        {isKarakter && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("exam.keyRow")}</p>
            {memorizing ? (
              <div className="flex justify-center gap-1.5 rounded-lg bg-warning/15 p-2">
                {keyRow?.map((character, index) => (
                  <span
                    key={`${character}-${index}`}
                    className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-lg font-bold"
                  >
                    {character}
                  </span>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-muted/60 p-2 text-center text-sm font-semibold tracking-[0.5em] text-muted-foreground">
                • • • • •
              </p>
            )}
          </div>
        )}
      </div>

      <ol className="space-y-3">
        {columnQuestions.map((question, itemIndex) => (
          <li key={question.id} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {itemIndex + 1}
              </span>
              <span className="text-xs text-muted-foreground">{t("exam.chooseAnswer")}</span>
            </div>
            <QuestionInput
              question={question}
              value={answers[question.id]?.value ?? null}
              disabled={disabled || memorizing}
              onChange={(value) => onAnswer(question.id, value)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

export default KecermatanStage;
