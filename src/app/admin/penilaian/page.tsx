"use client";

import { useMemo, useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { gradeManualAnswer } from "@/lib/exam/service";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { AdminEmpty, AdminFilter, AdminPageHeader, AdminRow, AdminToolbar } from "@/components/admin/admin-page";
import { PageLoader } from "@/components/common/page-loader";
import { RichContent } from "@/components/common/rich-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AnswerRecord, EssayQuestion } from "@/types";

interface GradingRow {
  key: string;
  attemptId: string;
  userId: string;
  packageId: string;
  questionId: string;
  answer: AnswerRecord;
  submittedAt: string;
}

type GradingStatus = "pending" | "graded";

export default function AdminEssayGradingPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GradingStatus | "">("pending");
  const [drafts, setDrafts] = useState<Record<string, { score: string; note: string }>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // 0.4 — 1.0 grading scale (see src/lib/scoring/README.md in the docs section).
  const maxScore = 100;

  const rows = useMemo<GradingRow[]>(() => {
    const result: GradingRow[] = [];
    for (const attempt of db.attempts) {
      if (attempt.status !== "submitted") continue;
      for (const [questionId, answer] of Object.entries(attempt.answers)) {
        const question = db.questions.find((item) => item.id === questionId);
        if (!question) continue;
        if (question.type !== "essay") continue;
        result.push({
          key: `${attempt.id}:${questionId}`,
          attemptId: attempt.id,
          userId: attempt.userId,
          packageId: attempt.packageId,
          questionId,
          answer,
          submittedAt: attempt.submittedAt ?? attempt.startedAt,
        });
      }
    }
    return result.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [db.attempts, db.questions]);

  if (!hydrated) return <PageLoader />;

  const filtered = rows
    .filter((row) => {
      const graded = row.answer.manualScore !== undefined;
      if (statusFilter === "pending" && graded) return false;
      if (statusFilter === "graded" && !graded) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      const user = db.users.find((item) => item.id === row.userId);
      const pkg = db.packages.find((item) => item.id === row.packageId);
      return `${user?.name ?? ""} ${pkg ? tx(pkg.title) : ""}`.toLowerCase().includes(query);
    })
    .slice(0, 40);

  async function save(row: GradingRow) {
    const draft = drafts[row.key] ?? { score: String(row.answer.manualScore ?? ""), note: "" };
    const question = db.questions.find((item) => item.id === row.questionId);
    const limit = question?.type === "essay" ? question.maxScore : maxScore;
    const score = Number(draft.score);
    if (!Number.isFinite(score) || score < 0 || score > limit) {
      toast.error(t("admin.grading.invalid", { max: String(limit) }));
      return;
    }
    setBusyKey(row.key);
    try {
      await gradeManualAnswer(row.attemptId, row.questionId, score, draft.note);
      setDrafts((current) => ({ ...current, [row.key]: { score: "", note: "" } }));
      toast.success(t("admin.grading.saveToast", { score: String(score) }));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("admin.grading.title")}
        subtitle={t("admin.grading.subtitle")}
        count={filtered.length}
      />

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("admin.grading.searchPlaceholder")}
      >
        <AdminFilter
          label={t("common.status")}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as GradingStatus | "")}
          options={[
            { value: "pending", label: t("admin.grading.pending") },
            { value: "graded", label: t("admin.grading.graded") },
          ]}
        />
      </AdminToolbar>

      {filtered.length === 0 ? (
        <AdminEmpty title={t("admin.grading.empty")} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const question = db.questions.find((item) => item.id === row.questionId);
            const user = db.users.find((item) => item.id === row.userId);
            const pkg = db.packages.find((item) => item.id === row.packageId);
            const essay = question?.type === "essay" ? (question as EssayQuestion) : null;
            const draft = drafts[row.key] ?? { score: String(row.answer.manualScore ?? ""), note: "" };
            const graded = row.answer.manualScore !== undefined;

            return (
              <AdminRow key={row.key}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={graded ? "success" : "warning"}>
                      {graded ? t("admin.grading.graded") : t("admin.grading.pending")}
                    </Badge>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.name ?? row.userId} · {pkg ? tx(pkg.title) : row.packageId} ·{" "}
                      {formatDateTime(row.submittedAt, locale)}
                    </span>
                  </div>

                  {question && <RichContent content={question.prompt} dense />}

                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("admin.grading.studentAnswer")}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{String(row.answer.value ?? "").trim() || "—"}</p>
                  </div>

                  {essay && essay.rubric.length > 0 && (
                    <div className="rounded-xl bg-accent/40 p-3">
                      <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("admin.grading.rubric")}
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {essay.rubric.map((criterion) => (
                          <li key={criterion.id} className="flex items-center justify-between gap-3">
                            <span>{tx(criterion.label)}</span>
                            <span className="tabular-nums">0–{criterion.maxScore}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="w-full sm:w-32">
                      <label className="mb-1 block text-xs text-muted-foreground" htmlFor={`score-${row.key}`}>
                        {t("admin.grading.score")} (0–{essay?.maxScore ?? maxScore})
                      </label>
                      <input
                        id={`score-${row.key}`}
                        inputMode="numeric"
                        value={draft.score}
                        onChange={(event) =>
                          setDrafts({
                            ...drafts,
                            [row.key]: { ...draft, score: event.target.value.replace(/[^0-9]/g, "") },
                          })
                        }
                        placeholder="0"
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-xs text-muted-foreground" htmlFor={`note-${row.key}`}>
                        {t("admin.grading.note")}
                      </label>
                      <Textarea
                        id={`note-${row.key}`}
                        rows={2}
                        value={draft.note}
                        onChange={(event) =>
                          setDrafts({ ...drafts, [row.key]: { ...draft, note: event.target.value } })
                        }
                      />
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={busyKey === row.key || !draft.score}
                      onClick={() => save(row)}
                    >
                      {busyKey === row.key ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PenLine className="size-4" />
                      )}
                      {t("admin.grading.save")}
                    </Button>
                  </div>

                  {graded && (
                    <p className="text-xs text-muted-foreground">
                      {t("admin.grading.lastScore")}:{" "}
                      <span className="font-semibold text-foreground">{row.answer.manualScore}</span>
                      {row.answer.gradedAt ? ` · ${formatDateTime(row.answer.gradedAt, locale)}` : ""}
                    </p>
                  )}
                </div>
              </AdminRow>
            );
          })}
        </ul>
      )}
    </div>
  );
}
