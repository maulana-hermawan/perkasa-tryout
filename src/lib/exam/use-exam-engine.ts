"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnswerRecord, AnswerValue, Attempt, Question, Subtest } from "@/types";
import {
  loadExamContext,
  persistProgress,
  saveAnswers,
  submitAttempt,
  subtestSeconds,
  type ExamContext,
} from "./service";
import { columnCount, columnItemCount, columnSeconds } from "./generators";
import { dataSource } from "@/lib/repositories";

export type ExamPhase = "loading" | "intro" | "working" | "submitting" | "done";
export type SaveState = "idle" | "pending" | "saving" | "saved";

export interface ColumnInfo {
  /** 0-based column currently on screen. */
  index: number;
  total: number;
  /** Seconds left in this column. */
  remaining: number;
  secondsPerColumn: number;
  /** Question ids belonging to the current column. */
  ids: string[];
}

export interface ExamEngine {
  ctx: ExamContext | null;
  /** Times the participant left the tab (stored on the attempt). */
  tabSwitches: number;
  phase: ExamPhase;
  saveState: SaveState;
  subtestIndex: number;
  subtest: Subtest | null;
  /** Question ids of the current subtest, in presentation order. */
  ids: string[];
  index: number;
  question: Question | null;
  answers: Record<string, AnswerRecord>;
  /** Seconds left for the current subtest. */
  remaining: number;
  /** Seconds left for the whole attempt. */
  totalRemaining: number;
  answeredCount: number;
  markedCount: number;
  column: ColumnInfo | null;
  /** Unix ms used by every countdown — kept in state so rendering stays pure. */
  now: number;
  error: string | null;

  startSubtest: () => void;
  setAnswer: (questionId: string, value: AnswerValue | null) => void;
  toggleMark: (questionId: string) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  finishSubtest: (auto?: boolean) => void;
  submit: () => void;
  flush: () => Promise<void>;
}

const AUTOSAVE_DELAY = 700;

export function useExamEngine(attemptId: string): ExamEngine {
  const router = useRouter();

  const [ctx, setCtx] = useState<ExamContext | null>(null);
  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [subtestIndex, setSubtestIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});
  const [now, setNow] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [tabSwitches, setTabSwitches] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const dirtyRef = useRef<Record<string, AnswerRecord>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishingRef = useRef(false);

  /* ------------------------------- loading ------------------------------- */

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadExamContext(attemptId);
      if (cancelled) return;
      if (!loaded) {
        setError("not-found");
        setPhase("done");
        return;
      }
      if (loaded.attempt.status !== "in-progress") {
        router.replace(`/hasil/${attemptId}`);
        return;
      }
      setCtx(loaded);
      setAnswers(loaded.attempt.answers ?? {});
      setTabSwitches(loaded.attempt.tabSwitchCount ?? 0);
      const started = loaded.attempt.subtestProgress.filter((progress) => Boolean(progress.startedAt));
      const firstUnstarted = loaded.attempt.subtestProgress.findIndex((progress) => !progress.startedAt);
      const resumeIndex = firstUnstarted >= 0 ? firstUnstarted : loaded.attempt.subtestProgress.length - 1;
      setSubtestIndex(Math.max(0, resumeIndex));
      setIndex(loaded.attempt.currentIndex ?? 0);
      setNow(Date.now());
      setPhase(started.length === 0 || firstUnstarted >= 0 ? "intro" : "working");
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  /* -------------------------------- clock -------------------------------- */

  useEffect(() => {
    if (phase !== "working" && phase !== "intro") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ------------------------------- derived ------------------------------- */

  const subtest: Subtest | null = ctx ? (ctx.subtests[subtestIndex] ?? null) : null;
  const ids = useMemo(() => (subtest ? (ctx?.questionOrder[subtest.id] ?? []) : []), [ctx, subtest]);
  const question: Question | null = ctx && ids[index] ? (ctx.questions[ids[index]] ?? null) : null;

  const duration = useMemo(
    () => (ctx && subtest ? subtestSeconds(subtest, ctx.testType, ctx.pkg, ctx.shares[subtest.id]) : 0),
    [ctx, subtest],
  );

  const startedAt = subtest ? (ctx?.attempt.subtestProgress.find((p) => p.subtestId === subtest.id)?.startedAt ?? "") : "";

  const remaining = useMemo(() => {
    if (!startedAt) return duration;
    const deadline = new Date(startedAt).getTime() + duration * 1000;
    return Math.max(0, Math.round((deadline - now) / 1000));
  }, [startedAt, duration, now]);

  const totalRemaining = useMemo(() => {
    if (!ctx) return 0;
    return ctx.subtests.reduce((sum, item) => {
      const progress = ctx.attempt.subtestProgress.find((entry) => entry.subtestId === item.id);
      const seconds = subtestSeconds(item, ctx.testType, ctx.pkg, ctx.shares[item.id]);
      if (!progress?.startedAt) return sum + seconds;
      if (progress.endedAt) return sum;
      const deadline = new Date(progress.startedAt).getTime() + seconds * 1000;
      return sum + Math.max(0, Math.round((deadline - now) / 1000));
    }, 0);
  }, [ctx, now]);

  const answeredCount = useMemo(() => ids.filter((id) => Boolean(answers[id]?.value)).length, [answers, ids]);
  const markedCount = useMemo(() => ids.filter((id) => answers[id]?.marked).length, [answers, ids]);

  const column = useMemo<ColumnInfo | null>(() => {
    if (!ctx || !subtest || !subtest.generator) return null;
    const total = columnCount(subtest);
    if (total <= 0) return null;
    const secondsPerColumn = columnSeconds(subtest) ?? duration;
    const elapsed = Math.max(0, duration - remaining);
    const rawIndex = Math.floor(elapsed / Math.max(1, secondsPerColumn));
    const columnIndex = Math.min(total - 1, Math.max(0, rawIndex));
    const perColumn = columnItemCount(subtest);
    const start = columnIndex * perColumn;
    return {
      index: columnIndex,
      total,
      remaining: Math.max(0, secondsPerColumn - (elapsed - columnIndex * secondsPerColumn)),
      secondsPerColumn,
      ids: ids.slice(start, start + perColumn),
    };
  }, [ctx, subtest, duration, remaining, ids]);

  /* ---------------------------- tab switching ---------------------------- */

  useEffect(() => {
    if (phase !== "working") return;
    const handler = () => {
      if (document.visibilityState === "hidden") setTabSwitches((count) => count + 1);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase]);

  useEffect(() => {
    if (tabSwitches === 0) return;
    void persistProgress(attemptId, { tabSwitchCount: tabSwitches });
  }, [attemptId, tabSwitches]);

  /* ------------------------------- saving -------------------------------- */

  /**
   * Mirrors the participant row on the host screen (live sessions). It re-reads
   * the attempt instead of capturing render state so it can be called from the
   * autosave timer without going stale.
   */
  const syncSession = useCallback(
    async (options?: { finished?: boolean; score?: number }) => {
      const attempt = await dataSource.attempts.get(attemptId);
      if (!attempt?.sessionId) return;
      const session = await dataSource.sessions.get(attempt.sessionId);
      const me = session?.participants.find(
        (participant) => participant.userId === attempt.userId || participant.attemptId === attempt.id,
      );
      if (!me || !session) return;

      const ids = Object.values(attempt.questionOrder).flat();
      const answered = ids.filter((id) => Boolean(attempt.answers[id]?.value)).length;
      await dataSource.sessions.updateParticipant(session.id, me.id, {
        answered,
        total: ids.length,
        score: options?.score ?? me.score,
        status: options?.finished ? "finished" : me.status,
        attemptId: attempt.id,
      });
    },
    [attemptId],
  );

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const dirty = dirtyRef.current;
    if (Object.keys(dirty).length === 0) return;
    dirtyRef.current = {};
    setSaveState("saving");
    await saveAnswers(attemptId, dirty);
    setSaveState("saved");
    await syncSession();
  }, [attemptId, syncSession]);

  const scheduleSave = useCallback(() => {
    setSaveState("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, AUTOSAVE_DELAY);
  }, [flush]);

  // Best effort flush when the room unmounts (navigation, reload, tab close).
  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  /* ------------------------------- actions ------------------------------- */

  const setAnswer = useCallback(
    (questionId: string, value: AnswerValue | null) => {
      const target = ctx?.questions[questionId];
      if (!target) return;
      setAnswers((previous) => {
        const existing = previous[questionId];
        const record: AnswerRecord = {
          questionId,
          type: target.type,
          value,
          marked: existing?.marked ?? false,
          updatedAt: new Date().toISOString(),
          timeSpentSeconds: existing?.timeSpentSeconds ?? 0,
        };
        dirtyRef.current[questionId] = record;
        return { ...previous, [questionId]: record };
      });
      scheduleSave();
    },
    [ctx, scheduleSave],
  );

  const toggleMark = useCallback(
    (questionId: string) => {
      const target = ctx?.questions[questionId];
      if (!target) return;
      setAnswers((previous) => {
        const existing = previous[questionId];
        const record: AnswerRecord = {
          questionId,
          type: target.type,
          value: existing?.value ?? null,
          marked: !existing?.marked,
          updatedAt: new Date().toISOString(),
          timeSpentSeconds: existing?.timeSpentSeconds ?? 0,
        };
        dirtyRef.current[questionId] = record;
        return { ...previous, [questionId]: record };
      });
      scheduleSave();
    },
    [ctx, scheduleSave],
  );

  const goTo = useCallback((nextIndex: number) => {
    setIndex((previous) => {
      const clamped = Math.min(Math.max(0, nextIndex), Math.max(0, ids.length - 1));
      return clamped === previous ? previous : clamped;
    });
  }, [ids.length]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  /** Persist the position so a refresh resumes where the participant left off. */
  useEffect(() => {
    if (!ctx || phase !== "working") return;
    void persistProgress(attemptId, {
      currentIndex: index,
      currentSubtestId: subtest?.id,
      timeLeftSeconds: totalRemaining,
    });
  }, [attemptId, ctx, index, phase, subtest?.id, totalRemaining]);

  const startSubtest = useCallback(() => {
    if (!ctx || !subtest) return;
    const stamp = new Date().toISOString();
    const progress = ctx.attempt.subtestProgress.map((entry) =>
      entry.subtestId === subtest.id ? { ...entry, startedAt: stamp } : entry,
    );
    setCtx((previous) =>
      previous ? { ...previous, attempt: { ...previous.attempt, subtestProgress: progress } } : previous,
    );
    setNow(Date.now());
    setIndex(0);
    setPhase("working");
    void persistProgress(attemptId, {
      currentSubtestId: subtest.id,
      currentIndex: 0,
      subtestProgress: progress,
      timeLeftSeconds: totalRemaining,
    });
  }, [attemptId, ctx, subtest, totalRemaining]);

  const finishSubtest = useCallback(
    (auto = false) => {
      if (!ctx || !subtest || finishingRef.current) return;
      finishingRef.current = true;
      const stamp = new Date().toISOString();
      const progress = ctx.attempt.subtestProgress.map((entry) =>
        entry.subtestId === subtest.id
          ? {
              ...entry,
              endedAt: stamp,
              secondsUsed: entry.startedAt
                ? Math.max(0, Math.round((new Date(stamp).getTime() - new Date(entry.startedAt).getTime()) / 1000))
                : entry.secondsUsed,
            }
          : entry,
      );

      void (async () => {
        await flush();
        await persistProgress(attemptId, { subtestProgress: progress });
        setCtx((previous) =>
          previous ? { ...previous, attempt: { ...previous.attempt, subtestProgress: progress } } : previous,
        );
        const isLast = subtestIndex >= ctx.subtests.length - 1;
        if (isLast) {
          setPhase("submitting");
          const submitted = await submitAttempt(attemptId);
          await syncSession({ finished: true, score: Math.round(submitted.result?.totalScore ?? 0) });
          setPhase("done");
          router.replace(`/hasil/${attemptId}${auto ? "?auto=1" : ""}`);
          return;
        }
        setSubtestIndex(subtestIndex + 1);
        setIndex(0);
        setPhase("intro");
        finishingRef.current = false;
      })();
    },
    [attemptId, ctx, flush, router, subtest, subtestIndex, syncSession],
  );

  const submit = useCallback(() => {
    if (!ctx || phase === "submitting") return;
    setPhase("submitting");
    void (async () => {
      await flush();
      const currentSubtest = subtest;
      if (currentSubtest) {
        const stamp = new Date().toISOString();
        const progress = ctx.attempt.subtestProgress.map((entry) =>
          entry.subtestId === currentSubtest.id
            ? {
                ...entry,
                endedAt: entry.endedAt ?? stamp,
                secondsUsed: entry.startedAt
                  ? Math.max(0, Math.round((new Date(stamp).getTime() - new Date(entry.startedAt).getTime()) / 1000))
                  : entry.secondsUsed,
              }
            : entry,
        );
        await persistProgress(attemptId, { subtestProgress: progress });
      }
      const submitted = await submitAttempt(attemptId);
      await syncSession({ finished: true, score: Math.round(submitted.result?.totalScore ?? 0) });
      setPhase("done");
      router.replace(`/hasil/${attemptId}`);
    })();
  }, [attemptId, ctx, flush, phase, router, subtest, syncSession]);

  /* ------------------------------ auto finish ---------------------------- */

  useEffect(() => {
    if (phase !== "working" || remaining > 0) return;
    finishSubtest(true);
  }, [phase, remaining, finishSubtest]);

  return {
    ctx,
    phase,
    tabSwitches,
    saveState,
    subtestIndex,
    subtest,
    ids,
    index,
    question,
    answers,
    remaining,
    totalRemaining,
    answeredCount,
    markedCount,
    column,
    now,
    error,
    startSubtest,
    setAnswer,
    toggleMark,
    goTo,
    next,
    prev,
    finishSubtest,
    submit,
    flush,
  };
}

/** Convenience for the review screen: questions in presentation order. */
export function orderedQuestions(ctx: ExamContext | null): Question[] {
  if (!ctx) return [];
  const list: Question[] = [];
  for (const subtest of ctx.subtests) {
    for (const id of ctx.questionOrder[subtest.id] ?? []) {
      const question = ctx.questions[id];
      if (question) list.push(question);
    }
  }
  return list;
}

export type { Attempt, ExamContext };
