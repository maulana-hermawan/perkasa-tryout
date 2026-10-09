"use client";

import { useMemo, useState } from "react";
import { Copy, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { dataSource } from "@/lib/repositories";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { plainText } from "@/lib/exam/answer-format";
import type { Difficulty, Question, QuestionType } from "@/types";
import { AdminEmpty, AdminFilter, AdminPageHeader, AdminRow, AdminToolbar } from "@/components/admin/admin-page";
import { PageLoader } from "@/components/common/page-loader";
import { RichContent } from "@/components/common/rich-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function AdminQuestionBankPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<QuestionType | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [subtestId, setSubtestId] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);
  const [toDelete, setToDelete] = useState<Question | null>(null);

  const PAGE_SIZE = 12;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.questions.filter((question) => {
      if (type && question.type !== type) return false;
      if (difficulty && question.difficulty !== difficulty) return false;
      if (subtestId && question.subtestId !== subtestId) return false;
      if (query) {
        const haystack = `${plainText(tx(question.prompt))} ${question.topics.join(" ")} ${question.tags.join(" ")}`;
        if (!haystack.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [db.questions, search, type, difficulty, subtestId, tx]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const usedTypes = useMemo(() => {
    const set = new Set(db.questions.map((question) => question.type));
    return Array.from(set).sort();
  }, [db.questions]);

  if (!hydrated) return <PageLoader />;

  async function duplicate(question: Question) {
    setBusyId(question.id);
    try {
      await dataSource.questions.duplicate(question.id);
      toast.success(t("admin.questions.duplicateToast"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  async function removeQuestion() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await dataSource.questions.remove(toDelete.id);
      toast.success(t("admin.questions.deleteToast"));
      setToDelete(null);
      setPreview(null);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("admin.questions.title")}
        subtitle={t("admin.questions.subtitle")}
        count={filtered.length}
      />

      <AdminToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder={t("admin.questions.searchPlaceholder")}
      >
        <AdminFilter
          label={t("admin.questions.filterType")}
          value={type}
          onChange={(value) => {
            setType(value as QuestionType | "");
            setPage(1);
          }}
          options={usedTypes.map((item) => ({ value: item, label: item }))}
        />
        <AdminFilter
          label={t("admin.questions.filterDifficulty")}
          value={difficulty}
          onChange={(value) => {
            setDifficulty(value as Difficulty | "");
            setPage(1);
          }}
          options={DIFFICULTIES.map((item) => ({
            value: item,
            label: t(`admin.questions.${item}`),
          }))}
        />
        <AdminFilter
          label={t("admin.questions.filterSubtest")}
          value={subtestId}
          onChange={(value) => {
            setSubtestId(value);
            setPage(1);
          }}
          options={db.subtests
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => ({ value: item.id, label: tx(item.name) }))}
        />
      </AdminToolbar>

      {visible.length === 0 ? (
        <AdminEmpty title={t("admin.questions.empty")} />
      ) : (
        <>
          <ul className="space-y-2.5">
            {visible.map((question) => {
              const subtest = db.subtests.find((item) => item.id === question.subtestId);
              const generated = question.tags.includes("generated");
              return (
                <AdminRow key={question.id}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="muted">{question.type}</Badge>
                        <Badge
                          variant={
                            question.difficulty === "easy"
                              ? "success"
                              : question.difficulty === "hard"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {t(`admin.questions.${question.difficulty}`)}
                        </Badge>
                        {generated && <Badge variant="accent">{t("admin.questions.generated")}</Badge>}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm">{plainText(tx(question.prompt)).slice(0, 180)}</p>
                      <p className="text-[0.6875rem] text-muted-foreground">
                        {subtest ? tx(subtest.name) : question.subtestId} · {question.topics.join(", ") || "-"}
                      </p>
                    </div>

                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => setPreview(question)}
                      >
                        <Eye className="size-4" />
                        {t("admin.questions.preview")}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("admin.questions.duplicate")}
                        disabled={busyId === question.id}
                        onClick={() => duplicate(question)}
                      >
                        {busyId === question.id ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("common.delete")}
                        onClick={() => setToDelete(question)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </AdminRow>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t("common.previous")}
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                {t("common.next")}
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => (open ? null : setPreview(null))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.questions.preview")}</DialogTitle>
            <DialogDescription>{preview?.type}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <RichContent content={preview.prompt} />
              <Separator />
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">{t("admin.questions.filterDifficulty")}</dt>
                  <dd className="font-medium">{t(`admin.questions.${preview.difficulty}`)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("admin.questions.filterSubtest")}</dt>
                  <dd className="font-medium">
                    {db.subtests.find((item) => item.id === preview.subtestId)
                      ? tx(db.subtests.find((item) => item.id === preview.subtestId)!.name)
                      : preview.subtestId}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">{t("common.createdAt")}</dt>
                  <dd className="font-medium">{new Date(preview.createdAt).toLocaleString(locale)}</dd>
                </div>
              </dl>
              {preview.explanation && (
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="mb-1 text-xs font-semibold">{t("result.explanation")}</p>
                  <RichContent content={preview.explanation} dense className="text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setToDelete(preview);
                setPreview(null);
              }}
            >
              <Trash2 className="size-4" />
              {t("common.delete")}
            </Button>
            <Button onClick={() => setPreview(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => (open ? null : setToDelete(null))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.questions.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("admin.questions.deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={removeQuestion} disabled={Boolean(busyId)}>
              <Trash2 className="size-4" />
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
