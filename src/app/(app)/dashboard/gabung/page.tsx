"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, KeyRound, Loader2, PlayCircle, Radio, Timer, Users } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/format";
import { dataSource } from "@/lib/repositories";
import { startAttempt } from "@/lib/exam/service";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase } from "@/lib/store/db";
import type { Session } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { digitsOnly, formatDurationClock, initials } from "@/lib/utils";

export default function JoinSessionPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const user = useCurrentUser();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinedId, setJoinedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const live: Session | null = sessionId ? (db.sessions.find((item) => item.id === sessionId) ?? null) : null;

  async function handleFind(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSessionId(null);
    if (code.trim().length !== 6) {
      setError(t("session.codeInvalid"));
      return;
    }
    setSearching(true);
    const found = await dataSource.sessions.findByCode(code);
    setSearching(false);
    if (!found) {
      setError(t("session.codeNotFound"));
      return;
    }
    setSessionId(found.id);
  }

  async function handleJoin() {
    if (!live || !user) return;
    if (live.status === "ended") {
      toast.error(t("session.sessionClosed"));
      return;
    }
    if (live.maxParticipants !== null && live.participants.length >= live.maxParticipants) {
      toast.error(t("session.sessionFull"));
      return;
    }
    const participant = await dataSource.sessions.join(live.id, {
      userId: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      joinedAt: new Date().toISOString(),
      status: "online",
      answered: 0,
      total: live.participants[0]?.total ?? 0,
      currentIndex: 0,
      score: 0,
      tabSwitchCount: 0,
    });
    setJoinedId(participant.id);
    toast.success(t("session.joinSuccess", { code: live.code }));
  }

  async function handleStart() {
    if (!live || !user || starting) return;
    setStarting(true);
    try {
      const attempt = await startAttempt({ userId: user.id, packageId: live.packageId, sessionId: live.id });
      if (joinedId) {
        await dataSource.sessions.updateParticipant(live.id, joinedId, {
          attemptId: attempt.id,
          status: "online",
        });
      }
      router.push(`/ruang/${attempt.id}`);
    } catch {
      setStarting(false);
      toast.error(t("errors.generic"));
    }
  }

  const modeLabel = live
    ? live.mode === "self-paced"
      ? t("session.selfPaced")
      : t(`session.${live.mode}`)
    : "";
  const countdown = live?.opensAt ? Math.max(0, Math.round((new Date(live.opensAt).getTime() - now) / 1000)) : 0;
  const statusLabel = live
    ? t(`session.status${live.status.charAt(0).toUpperCase()}${live.status.slice(1)}`)
    : "";
  const canStart = Boolean(live && joinedId && (live.status === "running" || live.mode === "self-paced"));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("session.joinTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("session.joinDescription")}</p>
      </div>

      <Card>
        <CardContent>
          <form className="space-y-3" onSubmit={handleFind}>
            <div className="space-y-1.5">
              <Label htmlFor="code">{t("session.codeLabel")}</Label>
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(digitsOnly(event.target.value).slice(0, 6))}
                placeholder={t("session.codePlaceholder")}
                className="text-center font-mono text-lg tracking-[0.35em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                aria-invalid={Boolean(error)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {t("session.joinSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {live && (
        <Card className="overflow-hidden py-0 shadow-card">
          <CardHeader className="pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle>{tx(live.title)}</CardTitle>
                <CardDescription className="font-mono text-sm tracking-widest">{live.code}</CardDescription>
              </div>
              <Badge
                variant={
                  live.status === "running" ? "success" : live.status === "ended" ? "muted" : "warning"
                }
              >
                {live.mode === "live" ? <Radio className="size-3" /> : null}
                {statusLabel}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                <dd>{t("session.participants", { count: live.participants.length })}</dd>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="size-4" />
                <dd>{modeLabel}</dd>
              </div>
              {live.opensAt && (
                <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-4" />
                  <dd>
                    {t("session.scheduledOpen", { date: formatDateTime(live.opensAt, locale) })}
                    {countdown > 0 && ` · ${t("session.countdown", { countdown: formatDurationClock(countdown) })}`}
                  </dd>
                </div>
              )}
              {live.deadline && (
                <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-4" />
                  <dd>{t("session.deadline", { date: formatDate(live.deadline, locale) })}</dd>
                </div>
              )}
            </dl>

            <Separator />

            {joinedId ? (
              canStart ? (
                <Button className="w-full" size="lg" onClick={handleStart} disabled={starting}>
                  {starting ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                  {t("session.startParticipant")}
                </Button>
              ) : (
                <p className="flex items-center justify-center gap-2 rounded-xl bg-muted/60 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {live.status === "ended" ? t("session.sessionClosed") : t("session.waiting")}
                </p>
              )
            ) : (
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={handleJoin}
                disabled={live.status === "ended"}
              >
                {t("session.joinSubmit")}
              </Button>
            )}

            {live.participants.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">{t("session.lobbyTitle")}</p>
                <ul className="flex flex-wrap gap-2">
                  {live.participants.map((participant) => {
                    const total = participant.total || 1;
                    return (
                      <li
                        key={participant.id}
                        className="flex w-full items-center gap-2 rounded-xl border border-border bg-background p-2 sm:w-auto sm:flex-1"
                      >
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold text-white"
                          style={{ backgroundColor: participant.avatarColor }}
                        >
                          {initials(participant.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{participant.name}</span>
                          {participant.total > 0 && (
                            <Progress value={(participant.answered / total) * 100} className="mt-1 h-1" />
                          )}
                        </span>
                        {participant.status === "finished" && (
                          <Badge variant="success" className="tabular-nums">
                            {participant.score}
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <p className="text-center text-[0.6875rem] text-muted-foreground">{t("session.pollNotice")}</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
