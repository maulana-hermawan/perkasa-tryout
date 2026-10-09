"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag, Grid2x2, PlayCircle, Send } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useExamEngine } from "@/lib/exam/use-exam-engine";
import { subtestSeconds } from "@/lib/exam/service";
import { ExamHeader } from "@/components/exam/exam-header";
import { KecermatanStage } from "@/components/exam/kecermatan-stage";
import { QuestionInput } from "@/components/exam/question-input";
import { QuestionPalette } from "@/components/exam/question-palette";
import { SubmitDialog } from "@/components/exam/submit-dialog";
import { PageLoader } from "@/components/common/page-loader";
import { RichContent } from "@/components/common/rich-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ExamRoomPage() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { t, tx } = useI18n();
  const engine = useExamEngine(params.attemptId);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const { ctx, phase, subtest, subtestIndex, ids, index, question, answers, remaining, column } = engine;
  const isLastSubtest = ctx ? subtestIndex >= ctx.subtests.length - 1 : false;
  const isKecermatan = Boolean(subtest?.generator);
  const unanswered = ids.filter((id) => !answers[id]?.value).length;
  const marked = ids.filter((id) => answers[id]?.marked).length;

  // Warn before an accidental reload closes the room.
  useEffect(() => {
    if (phase !== "working") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  if (phase === "loading") return <PageLoader label={t("exam.loading")} />;

  if (!ctx || !subtest) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="space-y-3">
            <p className="font-semibold">{t("exam.notFound")}</p>
            <Button asChild variant="outline" size="sm" onClick={() => router.replace("/dashboard")}>
              {t("result.backToDashboard")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minutes = Math.round(subtestSeconds(subtest, ctx.testType, ctx.pkg, ctx.shares[subtest.id]) / 60);

  return (
    <div className="flex min-h-dvh flex-col">
      <ExamHeader
        title={tx(ctx.pkg.title)}
        subtestLabel={t("exam.subtestProgress", { index: subtestIndex + 1, total: ctx.subtests.length })}
        remaining={remaining}
        total={ids.length}
        answeredCount={engine.answeredCount}
        saveState={engine.saveState}
        onExit={() => setExitOpen(true)}
        danger={remaining <= 30}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-4 pb-32">
        {phase === "intro" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("exam.subtestIntro", { name: tx(subtest.name) })}</CardTitle>
              <CardDescription>{t("exam.subtestIntroDescription", { count: ids.length, minutes })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {subtest.description && (
                <p className="text-sm text-muted-foreground">{tx(subtest.description)}</p>
              )}
              {subtest.instruction && (
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className="mb-1 text-xs font-semibold">{t("exam.instruction")}</p>
                  <RichContent content={subtest.instruction} dense className="text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="muted">
                  {t("package.scoringCorrect", { value: subtest.scoring.correct })}
                </Badge>
                <Badge variant="muted">{t("package.scoringWrong", { value: subtest.scoring.wrong })}</Badge>
                {subtest.passingGrade !== null && (
                  <Badge variant="outline">
                    {t("package.passingGrade", { value: subtest.passingGrade })}
                  </Badge>
                )}
              </div>
              <Button className="w-full" size="lg" onClick={engine.startSubtest}>
                <PlayCircle className="size-4" />
                {t("exam.startSubtest")}
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "working" && isKecermatan && column && (
          <KecermatanStage
            questions={ctx.questions}
            column={column}
            answers={answers}
            onAnswer={engine.setAnswer}
            disabled={phase !== "working"}
          />
        )}

        {phase === "working" && !isKecermatan && question && (
          <Card className="gap-0 shadow-card">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">
                  {index + 1}
                  <span className="font-normal text-muted-foreground">/ {ids.length}</span>
                </span>
                {answers[question.id]?.marked && <Badge variant="warning">{t("exam.markShort")}</Badge>}
              </div>

              {question.type !== "listening" && question.type !== "group" && (
                <RichContent content={question.prompt} className="text-[1rem] leading-relaxed" />
              )}

              <QuestionInput
                question={question}
                value={answers[question.id]?.value ?? null}
                onChange={(value) => engine.setAnswer(question.id, value)}
              />
            </CardContent>
          </Card>
        )}
      </main>

      {/* Sticky, thumb-reachable controls */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-3 pt-2 pb-safe backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl">
          {phase === "working" && !isKecermatan && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label={t("exam.prev")}
                onClick={engine.prev}
                disabled={index === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <Button
                variant={answers[question?.id ?? ""]?.marked ? "warning" : "outline"}
                className="flex-1"
                onClick={() => question && engine.toggleMark(question.id)}
                disabled={!question}
              >
                <Flag className="size-4" />
                {answers[question?.id ?? ""]?.marked ? t("exam.unmark") : t("exam.mark")}
              </Button>

              <Button variant="outline" size="icon" aria-label={t("exam.paletteOpen")} onClick={() => setPaletteOpen(true)}>
                <Grid2x2 className="size-4" />
              </Button>

              {index < ids.length - 1 ? (
                <Button size="icon" aria-label={t("exam.next")} onClick={engine.next}>
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  aria-label={isLastSubtest ? t("exam.finish") : t("exam.finishSubtest")}
                  onClick={() => (isLastSubtest ? setSubmitOpen(true) : engine.finishSubtest())}
                >
                  <Send className="size-4" />
                </Button>
              )}
            </div>
          )}

          {phase === "working" && isKecermatan && (
            <Button
              className="w-full"
              variant={isLastSubtest ? "default" : "outline"}
              onClick={() => (isLastSubtest ? setSubmitOpen(true) : engine.finishSubtest())}
            >
              <Send className="size-4" />
              {isLastSubtest ? t("exam.finish") : t("exam.finishSubtest")}
            </Button>
          )}

          {phase === "submitting" && <p className="pb-1 text-center text-xs">{t("exam.saving")}</p>}
        </div>
      </div>

      <QuestionPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        ids={ids}
        answers={answers}
        index={index}
        onSelect={engine.goTo}
      />

      <SubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        unanswered={unanswered}
        marked={marked}
        submitting={phase === "submitting"}
        onConfirm={() => {
          setSubmitOpen(false);
          engine.submit();
        }}
      />

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("exam.exitTitle")}</DialogTitle>
            <DialogDescription>{t("exam.exitDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitOpen(false)}>
              {t("exam.stay")}
            </Button>
            <Button variant="destructive" onClick={() => router.replace(`/tryout/${ctx.pkg.id}`)}>
              {t("exam.exitConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
