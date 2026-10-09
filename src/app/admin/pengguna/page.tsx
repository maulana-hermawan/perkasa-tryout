"use client";

import { useMemo, useState } from "react";
import { Loader2, ShieldAlert, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { dataSource } from "@/lib/repositories";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { AdminEmpty, AdminPageHeader, AdminRow, AdminToolbar } from "@/components/admin/admin-page";
import { PageLoader } from "@/components/common/page-loader";
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
import { initials } from "@/lib/utils";
import type { User } from "@/types";

export default function AdminUsersPage() {
  const { t, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const users = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.users
      .filter((user) => {
        if (!query) return true;
        return `${user.name} ${user.email} ${user.institution ?? ""}`.toLowerCase().includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.users, search]);

  if (!hydrated) return <PageLoader />;

  async function toggleStatus(user: User) {
    setBusyId(user.id);
    try {
      await dataSource.users.update(user.id, { status: user.status === "active" ? "suspended" : "active" });
      toast.success(t("admin.users.statusToast", { name: user.name }));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await dataSource.users.remove(toDelete.id);
      toast.success(t("admin.users.deleteToast", { name: toDelete.name }));
      setToDelete(null);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("admin.users.title")} subtitle={t("admin.users.subtitle")} count={users.length} />

      <AdminToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("admin.users.searchPlaceholder")} />

      {users.length === 0 ? (
        <AdminEmpty title={t("admin.users.empty")} />
      ) : (
        <ul className="space-y-2.5">
          {users.map((user) => {
            const attempts = db.attempts.filter((attempt) => attempt.userId === user.id).length;
            const isAdmin = user.role === "admin";
            return (
              <AdminRow key={user.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {initials(user.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <Badge variant={user.role === "admin" ? "default" : user.role === "host" ? "accent" : "muted"}>
                        {t(`roles.${user.role}`)}
                      </Badge>
                      <Badge variant={user.status === "active" ? "success" : "destructive"}>
                        {user.status === "active" ? t("admin.users.activate") : t("admin.users.suspend")}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      {t("admin.users.joined")}: {formatDate(user.createdAt, locale)} · {t("admin.users.attempts")}:{" "}
                      {attempts} · {t("admin.users.lastLogin")}:{" "}
                      {user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : t("admin.users.never")}
                    </p>
                  </div>

                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      disabled={isAdmin || busyId === user.id}
                      onClick={() => toggleStatus(user)}
                      title={isAdmin ? t("admin.users.adminNote") : undefined}
                    >
                      {busyId === user.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : user.status === "active" ? (
                        <UserX className="size-4" />
                      ) : (
                        <UserCheck className="size-4" />
                      )}
                      {user.status === "active" ? t("admin.users.suspend") : t("admin.users.activate")}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("common.delete")}
                      disabled={isAdmin}
                      onClick={() => setToDelete(user)}
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

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => (open ? null : setToDelete(null))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-destructive" />
              {t("admin.users.deleteTitle")}
            </DialogTitle>
            <DialogDescription>{t("admin.users.deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={Boolean(busyId)}>
              <Trash2 className="size-4" />
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
