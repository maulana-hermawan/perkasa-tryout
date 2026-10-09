"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Pause, Play, Radio, Square, Trophy, Users } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { setSessionStatus } from "@/lib/exam/session-service";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, initials } from "@/lib/utils";
import type { Session } from "@/types";

export default function HostRoomPage() {
  const params = useParams<{ id: string }>();
  const { t, tx } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);

  const session = db.sessions.find((item) => item.id === params.id);

  if (!hydrated) return <PageLoader />;

  if (!session) {
    return (
      <Card className="items-center gap-3 py-14 text-center">
        <p className="font-semibold">{t("session.notFound")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/host">{t("session.backToHost")}</Link>
        </Button>
      </Card>
    );
  }

  const pkg = db.packages.find((item) => item.id === session.packageId);
  const totalQuestions = Object.values(session.participants[0] ?? {}).length
    ? (session.participants[0]?.total ?? 0)
    : (pkg?.totalQuestions ?? 0);

  async function transition(status: Session["status"], message: string) {
    setBusy(true);
    try {
      await setSessionStatus(session!.id, status);
      toast.success(message);
      if (status === "ended") setConfirmEnd(false);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  const ranked = [...session.participants]
    .filter((participant) => participant.status === "finished" || participant.score > 0)
    .sort((a, b) => b.score - a.score || a.joinedAt.localeCompare(b.joinedAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/host">
            <ArrowLeft className="size-4" />
            {t("session.backToHost")}
          </Link>
        </Button>
        <Badge variant="accent">
          <Radio className="size-3" />
          {t(`session.status${session.status.charAt(0).toUpperCase()}${session.status.slice(1)}`)}
        </Badge>
      </div>

      {/* --------------------------- code & controls --------------------------- */}
      <Card className="overflow-hidden border-primary/25 py-0 shadow-pop">
        <div className="bg-gradient-to-br from-primary to-violet-700 p-5 text-primary-foreground">
          <p className="flex items-center gap-1.5 text-xs opacity-90">
            <Users className="size-3.5" />
            {session.maxParticipants
              ? t("session.participantCount", { count: session.participants.length, max: session.maxParticipants })
              : t("session.participants", { count: session.participants.length })}
          </p>
          <p className="mt-1 truncate text-lg font-bold">{tx(session.title)}</p>
          <p className="truncate text-xs opacity-80">{pkg ? tx(pkg.title) : ""}</p>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-[0.625rem] tracking-wide uppercase opacity-80">{t("session.codeTitle")}</p>
              <p className="font-mono text-3xl font-bold tracking-[0.35em] tabular-nums">{session.code}</p>
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="size-12 shrink-0 bg-white/20 text-white hover:bg-white/30"
              aria-label={t("common.copy")}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(session.code)
                  .then(() => toast.success(t("session.codeCopied", { code: session.code })))
                  .catch(() => toast.success(t("session.codeCopied", { code: session.code })));
              }}
            >
              <Copy className="size-5" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[0.6875rem] opacity-80">{t("session.codeCopyHint")}</p>
        </div>

        <CardContent className="flex flex-wrap gap-2">
          {session.status === "lobby" && (
            <Button className="flex-1" onClick={() => transition("running", t("session.started"))} disabled={busy}>
              <Play className="size-4" />
              {t("session.start")}
            </Button>
          )}
          {session.status === "running" && (
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => transition("paused", t("session.pausedToast"))}
              disabled={busy}
            >
              <Pause className="size-4" />
              {t("session.pause")}
            </Button>
          )}
          {session.status === "paused" && (
            <Button className="flex-1" onClick={() => transition("running", t("session.resumedToast"))} disabled={busy}>
              <Play className="size-4" />
              {t("session.resume")}
            </Button>
          )}
          {session.status !== "ended" && (
            <Button variant="destructive" className="flex-1" onClick={() => setConfirmEnd(true)} disabled={busy}>
              <Square className="size-4" />
              {t("session.end")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------ monitor ------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("session.monitorTitle")}</CardTitle>
          <CardDescription>{t("session.pollNotice")}</CardDescription>
        </CardHeader>
        <CardContent>
          {session.participants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("session.monitorEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {session.participants.map((participant) => {
                const total = participant.total || totalQuestions || 1;
                const ratio = Math.min(100, (participant.answered / total) * 100);
                return (
                  <li
                    key={participant.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-2.5"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: participant.avatarColor }}
                    >
                      {initials(participant.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{participant.name}</p>
                      <Progress value={ratio} className="mt-1.5 h-1.5" />
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-xs">
                      <Badge variant="muted" className="tabular-nums">
                        {participant.answered}/{total}
                      </Badge>
                      <Badge variant={participant.status === "finished" ? "success" : "outline"} className="tabular-nums">
                        {participant.score}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------- leaderboard ----------------------------- */}
      {session.leaderboard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-warning-foreground" />
              {t("session.leaderboardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranked.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("session.leaderboardEmpty")}</p>
            ) : (
              <ol className="space-y-2">
                {ranked.slice(0, 10).map((participant, index) => (
                  <li key={participant.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                        index === 0
                          ? "bg-warning/25 text-warning-foreground"
                          : index === 1
                            ? "bg-muted text-muted-foreground"
                            : index === 2
                              ? "bg-orange-500/15 text-orange-700 dark:text-orange-400"
                              : "bg-muted/60 text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{participant.name}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{participant.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-center text-xs text-muted-foreground">{t("session.youHost")}</p>

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("session.endConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("session.endConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => transition("ended", t("session.endedToast"))} disabled={busy}>
              <Square className="size-4" />
              {t("session.endConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
