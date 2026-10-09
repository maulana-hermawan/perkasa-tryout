"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { AdminEmpty, AdminFilter, AdminPageHeader, AdminRow, AdminToolbar } from "@/components/admin/admin-page";
import { PageLoader } from "@/components/common/page-loader";
import { Badge } from "@/components/ui/badge";

/** Activity action codes → dictionary key (see `admin.logs.actions`). */
const ACTION_LABELS: Record<string, string> = {
  "auth.login": "admin.logs.actions.login",
  "auth.register": "admin.logs.actions.register",
  "attempt.start": "admin.logs.actions.start",
  "attempt.submit": "admin.logs.actions.submit",
  "payment.upload": "admin.logs.actions.uploadProof",
  "payment.approve": "admin.logs.actions.approve",
  "payment.reject": "admin.logs.actions.reject",
  "session.create": "admin.logs.actions.createSession",
  "session.end": "admin.logs.actions.endSession",
  "user.update": "admin.logs.actions.updateUser",
};

function actionLabel(action: string, t: (key: string) => string) {
  return ACTION_LABELS[action] ? t(ACTION_LABELS[action]) : action;
}

export default function AdminActivityLogPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");

  const logs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.activityLogs
      .filter((log) => {
        if (action && log.action !== action) return false;
        if (!query) return true;
        return `${log.userName} ${log.action} ${tx(log.message)} ${log.targetId}`.toLowerCase().includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);
  }, [db.activityLogs, search, action, tx]);

  const usedActions = useMemo(
    () => Array.from(new Set(db.activityLogs.map((log) => log.action))).sort(),
    [db.activityLogs],
  );

  if (!hydrated) return <PageLoader />;

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("admin.logs.title")} subtitle={t("admin.logs.subtitle")} count={logs.length} />

      <AdminToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("admin.logs.searchPlaceholder")}>
        <AdminFilter
          label={t("admin.logs.filterAction")}
          value={action}
          onChange={setAction}
          options={usedActions.map((item) => ({
            value: item,
            label: actionLabel(item, t),
          }))}
        />
      </AdminToolbar>

      {logs.length === 0 ? (
        <AdminEmpty title={t("admin.logs.empty")} />
      ) : (
        <ol className="relative space-y-2.5 border-l border-border pl-4">
          {logs.map((log) => (
            <li key={log.id} className="relative">
              <span className="absolute top-3.5 -left-[1.3125rem] flex size-3 items-center justify-center rounded-full bg-primary/20 ring-4 ring-background">
                <Activity className="size-2 text-primary" />
              </span>
              <AdminRow>
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">
                        {actionLabel(log.action, t)}
                      </Badge>
                      <span className="truncate text-xs text-muted-foreground">{log.userName}</span>
                    </div>
                    <p className="mt-1 text-sm">{tx(log.message)}</p>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      {log.targetType}: {log.targetId} · {formatRelative(log.createdAt, locale)} ·{" "}
                      {formatDateTime(log.createdAt, locale)}
                    </p>
                  </div>
                </div>
              </AdminRow>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
