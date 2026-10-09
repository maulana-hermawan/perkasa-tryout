"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, Radio, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { createSession, deleteSession } from "@/lib/exam/session-service";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/exam/native-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SessionMode } from "@/types";
import { cn } from "@/lib/utils";

export default function HostSessionsPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const user = useCurrentUser();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    packageId: "",
    title: "",
    mode: "live" as SessionMode,
    leaderboard: true,
    showResultsImmediately: false,
    requireLogin: true,
    maxParticipants: "",
  });
  const [toDelete, setToDelete] = useState<string | null>(null);

  const packages = useMemo(
    () => db.packages.filter((pkg) => pkg.status === "published"),
    [db.packages],
  );

  const sessions = useMemo(() => {
    if (!user) return [];
    return db.sessions
      .filter((session) => session.hostId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.sessions, user]);

  if (!hydrated) return <PageLoader />;

  async function handleCreate() {
    if (!user || !form.packageId) return;
    setPending(true);
    try {
      const session = await createSession({
        packageId: form.packageId,
        hostId: user.id,
        title: form.title.trim() || (packages.find((pkg) => pkg.id === form.packageId)?.title.id ?? "Sesi"),
        mode: form.mode,
        leaderboard: form.leaderboard,
        showResultsImmediately: form.showResultsImmediately,
        requireLogin: form.requireLogin,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
      });
      toast.success(t("session.createdToast", { code: session.code }));
      setCreating(false);
      router.push(`/host/${session.id}`);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(sessionId: string) {
    await deleteSession(sessionId);
    setToDelete(null);
    toast.success(t("session.deletedToast"));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("session.hostTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("session.description")}</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {t("session.createSubmit")}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="items-center gap-2 py-12 text-center">
          <Radio className="size-8 text-muted-foreground" />
          <CardTitle>{t("session.emptyTitle")}</CardTitle>
          <CardDescription>{t("session.emptyDescription")}</CardDescription>
          <Button className="mt-2" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t("session.createSubmit")}
          </Button>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {sessions.map((session) => {
            const pkg = db.packages.find((item) => item.id === session.packageId);
            return (
              <li key={session.id}>
                <Card className="gap-0 py-0 shadow-card">
                  <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-sm font-bold tracking-wider text-primary">
                      {session.code.slice(0, 3)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{tx(session.title)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {pkg ? tx(pkg.title) : session.packageId} · {formatDateTime(session.createdAt, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={session.status === "running" ? "success" : session.status === "ended" ? "muted" : "warning"}>
                        {t(`session.status${session.status.charAt(0).toUpperCase()}${session.status.slice(1)}`)}
                      </Badge>
                      <Badge variant="outline">
                        <Users className="size-3" />
                        {session.participants.length}
                      </Badge>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
                        <Link href={`/host/${session.id}`}>{t("session.openHost")}</Link>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("common.delete")}
                        onClick={() => setToDelete(session.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------------------ create ------------------------------ */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("session.createTitle")}</DialogTitle>
            <DialogDescription>{t("session.createDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-package">{t("session.packageLabel")}</Label>
              <NativeSelect
                ariaLabel={t("session.packageLabel")}
                className="h-11 w-full text-sm"
                placeholder={t("session.packagePlaceholder")}
                value={form.packageId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, packageId: value }))}
                options={packages.map((pkg) => ({ value: pkg.id, label: tx(pkg.title) }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="session-title">{t("session.titleLabel")}</Label>
              <Input
                id="session-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={t("session.titlePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="session-mode">{t("session.modeLabel")}</Label>
              <NativeSelect
                ariaLabel={t("session.modeLabel")}
                className="h-11 w-full text-sm"
                value={form.mode}
                onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value as SessionMode }))}
                options={[
                  { value: "live", label: t("session.modeLive") },
                  { value: "self-paced", label: t("session.modeSelfPaced") },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="session-max">{t("session.maxParticipantsLabel")}</Label>
              <Input
                id="session-max"
                inputMode="numeric"
                value={form.maxParticipants}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxParticipants: event.target.value.replace(/[^0-9]/g, "") }))
                }
                placeholder="40"
              />
            </div>

            <Separator />

            <Toggle
              label={t("session.leaderboardLabel")}
              checked={form.leaderboard}
              onChange={(value) => setForm((prev) => ({ ...prev, leaderboard: value }))}
            />
            <Toggle
              label={t("session.showResultsLabel")}
              checked={form.showResultsImmediately}
              onChange={(value) => setForm((prev) => ({ ...prev, showResultsImmediately: value }))}
            />
            <Toggle
              label={t("session.requireLoginLabel")}
              checked={form.requireLogin}
              onChange={(value) => setForm((prev) => ({ ...prev, requireLogin: value }))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={pending || !form.packageId}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {t("session.createSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------ delete ------------------------------ */}
      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => (open ? null : setToDelete(null))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("session.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("session.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => toDelete && handleDelete(toDelete)}>
              <Trash2 className="size-4" />
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={cn("flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3")}>
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
