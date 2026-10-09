"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Radio, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { deleteSession, setSessionStatus } from "@/lib/exam/session-service";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { AdminEmpty, AdminPageHeader, AdminRow, AdminToolbar } from "@/components/admin/admin-page";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminSessionsPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.sessions
      .filter((session) => {
        if (!query) return true;
        const pkg = db.packages.find((item) => item.id === session.packageId);
        return `${session.code} ${tx(session.title)} ${pkg ? tx(pkg.title) : ""}`.toLowerCase().includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db, search, tx]);

  if (!hydrated) return <PageLoader />;

  async function endSession(id: string, code: string) {
    setBusyId(id);
    try {
      await setSessionStatus(id, "ended");
      toast.success(t("admin.sessions.endToast", { code }));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  async function removeSession(id: string, code: string) {
    setBusyId(id);
    try {
      await deleteSession(id);
      toast.success(t("admin.sessions.deleteToast", { code }));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("admin.sessions.title")} subtitle={t("admin.sessions.subtitle")} count={sessions.length} />

      <AdminToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("admin.sessions.searchPlaceholder")} />

      {sessions.length === 0 ? (
        <AdminEmpty title={t("admin.sessions.empty")} />
      ) : (
        <ul className="space-y-2.5">
          {sessions.map((session) => {
            const pkg = db.packages.find((item) => item.id === session.packageId);
            const host = db.users.find((item) => item.id === session.hostId);
            return (
              <AdminRow key={session.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">
                    {session.code.slice(0, 3)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{tx(session.title)}</p>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tracking-wider">
                        {session.code}
                      </span>
                      <Badge
                        variant={
                          session.status === "running" ? "success" : session.status === "ended" ? "muted" : "warning"
                        }
                      >
                        <Radio className="size-3" />
                        {t(`session.status${session.status.charAt(0).toUpperCase()}${session.status.slice(1)}`)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {pkg ? tx(pkg.title) : "-"} · {t("admin.sessions.host")}: {host?.name ?? session.hostId}
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      {t("admin.sessions.participants")}: {session.participants.length} · {t("admin.sessions.created")}:{" "}
                      {formatDateTime(session.createdAt, locale)}
                    </p>
                  </div>

                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
                      <Link href={`/host/${session.id}`}>{t("admin.sessions.openHost")}</Link>
                    </Button>
                    {session.status !== "ended" && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("session.end")}
                        disabled={busyId === session.id}
                        onClick={() => endSession(session.id, session.code)}
                      >
                        {busyId === session.id ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("common.delete")}
                      onClick={() => removeSession(session.id, session.code)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </AdminRow>
            );
          })}
        </ul>
      )}
    </div>
  );
}
