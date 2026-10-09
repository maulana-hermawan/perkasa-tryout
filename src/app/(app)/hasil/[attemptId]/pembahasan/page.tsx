"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Lock, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { usePackageAccess } from "@/lib/hooks/use-package-access";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { describeAnswer, describeCorrectAnswer, isAnswerCorrect } from "@/lib/exam/answer-format";
import { RichContent } from "@/components/common/rich-content";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Pembahasan: the answer key plus an explanation per question.
 *
 * Freemium packages keep this screen locked until the payment is approved —
 * the gate is the same access rule that unlocks detailed results.
 */
export default function DiscussionPage() {
  const params = useParams<{ attemptId: string }>();
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const [onlyWrong, setOnlyWrong] = useState(false);

  const attempt = db.attempts.find((item) => item.id === params.attemptId);
  const pkg = attempt ? db.packages.find((item) => item.id === attempt.packageId) : undefined;
  const access = usePackageAccess(attempt?.packageId ?? "");

  if (!hydrated) return <PageLoader label={t("result.loading")} />;

  if (!attempt || !pkg) {
    return (
      <Card className="items-center gap-3 py-14 text-center">
        <p className="font-semibold">{t("result.notFound")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">{t("result.backToDashboard")}</Link>
        </Button>
      </Card>
    );
  }

  if (!access.discussionUnlocked) {
    return (
      <Card className="items-center gap-3 py-14 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <CardTitle>{t("result.discussionLocked")}</CardTitle>
        <CardDescription className="max-w-sm">{t("result.discussionLockedDescription")}</CardDescription>
        <Button asChild variant="outline" size="sm">
          <Link href={`/hasil/${attempt.id}`}>{t("common.back")}</Link>
        </Button>
      </Card>
    );
  }

  const entries = pkg.subtests
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((entry) => {
      const subtest = db.subtests.find((item) => item.id === entry.subtestId);
      const ids = attempt.questionOrder[entry.subtestId] ?? [];
      return ids.map((id, position) => ({ subtest, id, position }));
    })
    .map((entry) => ({ ...entry, question: db.questions.find((item) => item.id === entry.id) }))
    .filter((entry) => Boolean(entry.question));

  const visible = onlyWrong
    ? entries.filter((entry) => isAnswerCorrect(entry.question!, attempt.answers[entry.id]?.value ?? null) === false)
    : entries;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{t("result.discussion")}</h1>
          <p className="truncate text-sm text-muted-foreground">{tx(pkg.title)}</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="-mr-2">
          <Link href={`/hasil/${attempt.id}`}>
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={onlyWrong}
          onChange={(event) => setOnlyWrong(event.target.checked)}
        />
        {t("result.wrong")}
      </label>

      {visible.map((entry, index) => {
        const question = entry.question!;
        const record = attempt.answers[entry.id];
        const correct = isAnswerCorrect(question, record?.value ?? null);
        const yours = describeAnswer(question, record?.value ?? null, locale, tx);
        const key = describeCorrectAnswer(question, locale, tx);

        return (
          <Card key={entry.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardDescription className="text-xs font-semibold">
                  {entry.subtest ? tx(entry.subtest.name) : ""} · #{entry.position + 1}
                </CardDescription>
                <Badge variant={correct === true ? "success" : correct === false ? "destructive" : "muted"}>
                  {correct === true ? <Check className="size-3" /> : correct === false ? <X className="size-3" /> : null}
                  {correct === true ? t("result.correct") : correct === false ? t("result.wrong") : t("result.notAnswered")}
                </Badge>
              </div>
              <RichContent content={question.prompt} className="text-[0.95rem]" />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-2">
                  <p className="text-[0.6875rem] font-medium text-muted-foreground">{t("result.answerYours")}</p>
                  <p className="break-words">{yours || t("result.notAnswered")}</p>
                </div>
                {key && (
                  <div className="rounded-lg border border-border bg-success/5 p-2">
                    <p className="text-[0.6875rem] font-medium text-muted-foreground">{t("result.answerKey")}</p>
                    <p className="break-words">{key}</p>
                  </div>
                )}
              </div>
              {question.explanation && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-1 text-[0.6875rem] font-semibold">{t("result.explanation")}</p>
                  <RichContent content={question.explanation} dense className="text-muted-foreground" />
                </div>
              )}
              {index === visible.length - 1 && (
                <p className="pt-2 text-center text-xs text-muted-foreground">{t("result.discussionUnlocked")}</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {visible.length === 0 && (
        <Card className="items-center gap-2 py-12 text-center">
          <p className="font-semibold">{t("common.noResults")}</p>
          <CardDescription>{t("common.noResultsDescription")}</CardDescription>
        </Card>
      )}
    </div>
  );
}
