"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { dataSource } from "@/lib/repositories";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import type { Payment, PaymentStatus } from "@/types";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FILTERS: (PaymentStatus | "all")[] = ["pending", "approved", "rejected", "all"];

export default function AdminPaymentsPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const admin = useCurrentUser();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Payment | null>(null);

  const payments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.payments
      .filter((payment) => {
        if (status !== "all" && payment.status !== status) return false;
        if (!query) return true;
        const user = db.users.find((item) => item.id === payment.userId);
        const pkg = db.packages.find((item) => item.id === payment.packageId);
        const haystack = [
          payment.invoiceCode,
          user?.name ?? "",
          user?.email ?? "",
          pkg ? tx(pkg.title) : "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db, search, status, tx]);

  if (!hydrated) return <PageLoader />;

  async function handleApprove(payment: Payment) {
    if (!admin) return;
    setBusyId(payment.id);
    try {
      await dataSource.payments.approve(payment.id, admin.id);
      toast.success(t("admin.payments.approveToast", { invoice: payment.invoiceCode }));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!admin || !rejecting) return;
    setBusyId(rejecting.id);
    try {
      await dataSource.payments.reject(rejecting.id, admin.id, reason.trim() || "-");
      toast.success(t("admin.payments.rejectToast", { invoice: rejecting.invoiceCode }));
      setRejecting(null);
      setReason("");
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusyId(null);
    }
  }

  const counts = FILTERS.reduce<Record<string, number>>((acc, key) => {
    acc[key] = key === "all" ? db.payments.length : db.payments.filter((item) => item.status === key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("admin.payments.title")}
        subtitle={t("admin.payments.subtitle")}
        count={payments.length}
      />

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("admin.payments.searchPlaceholder")}
      >
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={
                status === key
                  ? "min-h-9 shrink-0 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground"
                  : "min-h-9 shrink-0 rounded-full border border-border bg-card px-3.5 text-sm text-muted-foreground hover:bg-accent"
              }
            >
              {t(`admin.payments.filter${key.charAt(0).toUpperCase()}${key.slice(1)}`)} ({counts[key] ?? 0})
            </button>
          ))}
        </div>
      </AdminToolbar>

      {payments.length === 0 ? (
        <AdminEmpty title={t("admin.payments.empty")} />
      ) : (
        <ul className="space-y-2.5">
          {payments.map((payment) => {
            const user = db.users.find((item) => item.id === payment.userId);
            const pkg = db.packages.find((item) => item.id === payment.packageId);
            const method = db.settings.paymentMethods.find((item) => item.id === payment.methodId);
            return (
              <AdminRow key={payment.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold">{payment.invoiceCode}</p>
                      <Badge
                        variant={
                          payment.status === "approved"
                            ? "success"
                            : payment.status === "rejected"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {t(`admin.payments.filter${payment.status.charAt(0).toUpperCase()}${payment.status.slice(1)}`)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm">{user?.name ?? payment.userId}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {pkg ? tx(pkg.title) : "-"} · {method?.name ?? payment.methodId}
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      {formatDateTime(payment.uploadedAt ?? payment.createdAt, locale)} ·{" "}
                      {t("admin.payments.uniqueCode", { code: payment.uniqueCode })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums">{formatCurrency(payment.total, locale)}</p>
                    {payment.discount > 0 && (
                      <p className="text-[0.6875rem] text-muted-foreground">
                        -{formatCurrency(payment.discount, locale)}
                        {payment.voucherCode ? ` · ${payment.voucherCode}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {payment.status === "rejected" && payment.note && (
                  <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                    {payment.note}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {payment.proofUrl && (
                    <Button size="sm" variant="outline" onClick={() => setPreview(payment)}>
                      <Search className="size-4" />
                      {t("admin.payments.viewProof")}
                    </Button>
                  )}
                  {payment.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(payment)} disabled={busyId === payment.id}>
                        {busyId === payment.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {t("admin.payments.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejecting(payment);
                          setReason("");
                        }}
                      >
                        <X className="size-4" />
                        {t("admin.payments.reject")}
                      </Button>
                    </>
                  )}
                </div>
              </AdminRow>
            );
          })}
        </ul>
      )}

      {/* Proof preview */}
      <Dialog open={Boolean(preview)} onOpenChange={(open) => (open ? null : setPreview(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.payments.proof")}</DialogTitle>
            <DialogDescription>{preview?.invoiceCode}</DialogDescription>
          </DialogHeader>
          {preview?.proofUrl && (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.proofUrl} alt={preview.proofFileName ?? "proof"} className="mx-auto max-h-[60vh]" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              {t("common.close")}
            </Button>
            {preview?.status === "pending" && (
              <Button onClick={() => preview && handleApprove(preview)}>
                <Check className="size-4" />
                {t("admin.payments.approve")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => (open ? null : setRejecting(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.payments.rejectTitle")}</DialogTitle>
            <DialogDescription>{t("admin.payments.rejectDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">{t("admin.payments.rejectReason")}</Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("admin.payments.rejectPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={Boolean(busyId)}>
              {t("admin.payments.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
