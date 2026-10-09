"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/format";
import { dataSource } from "@/lib/repositories";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { AdminEmpty, AdminPageHeader, AdminRow } from "@/components/admin/admin-page";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/exam/native-select";
import { Switch } from "@/components/ui/switch";
import { uid } from "@/lib/utils";
import type { Voucher } from "@/types";

const DAY = 86_400_000;

interface VoucherForm {
  code: string;
  type: "percent" | "amount";
  value: string;
  minAmount: string;
  maxDiscount: string;
  usageLimit: string;
  days: string;
  active: boolean;
}

const emptyForm: VoucherForm = {
  code: "",
  type: "percent",
  value: "10",
  minAmount: "",
  maxDiscount: "",
  usageLimit: "",
  days: "30",
  active: true,
};

export default function AdminVouchersPage() {
  const { t, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Kept in state (not read during render) so the "expired" badge stays pure.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!hydrated) return <PageLoader />;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(voucher: Voucher) {
    setEditing(voucher);
    const days = Math.max(
      1,
      Math.round((new Date(voucher.validUntil).getTime() - new Date(voucher.validFrom).getTime()) / DAY),
    );
    setForm({
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      minAmount: voucher.minAmount ? String(voucher.minAmount) : "",
      maxDiscount: voucher.maxDiscount ? String(voucher.maxDiscount) : "",
      usageLimit: voucher.usageLimit ? String(voucher.usageLimit) : "",
      days: String(days),
      active: voucher.active,
    });
    setOpen(true);
  }

  async function handleSave() {
    const code = form.code.trim().toUpperCase();
    if (!code) return;
    setPending(true);
    try {
      const now = Date.now();
      const payload = {
        code,
        type: form.type,
        value: Number(form.value) || 0,
        minAmount: form.minAmount ? Number(form.minAmount) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        validFrom: new Date(now).toISOString(),
        validUntil: new Date(now + Math.max(1, Number(form.days) || 30) * DAY).toISOString(),
        active: form.active,
        packageIds: editing?.packageIds ?? [],
      };

      if (editing) {
        await dataSource.vouchers.update(editing.id, payload);
        toast.success(t("admin.vouchers.updateToast", { code }));
      } else {
        await dataSource.vouchers.create({
          id: uid("voc"),
          usedCount: 0,
          description: { id: "", en: "" },
          ...payload,
        } as Voucher);
        toast.success(t("admin.vouchers.createToast", { code }));
      }
      setOpen(false);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(voucher: Voucher) {
    await dataSource.vouchers.remove(voucher.id);
    toast.success(t("admin.vouchers.deleteToast", { code: voucher.code }));
  }

  const vouchers = [...db.vouchers].sort((a, b) => new Date(b.validUntil).getTime() - new Date(a.validUntil).getTime());

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("admin.vouchers.title")}
        subtitle={t("admin.vouchers.subtitle")}
        count={vouchers.length}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            {t("admin.vouchers.newVoucher")}
          </Button>
        }
      />

      {vouchers.length === 0 ? (
        <AdminEmpty title={t("admin.vouchers.empty")} />
      ) : (
        <ul className="space-y-2.5">
          {vouchers.map((voucher) => {
            const expired = new Date(voucher.validUntil).getTime() < now;
            const exhausted = voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit;
            return (
              <AdminRow key={voucher.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TicketPercent className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold tracking-wide">{voucher.code}</p>
                      <Badge variant={voucher.active && !expired && !exhausted ? "success" : "muted"}>
                        {voucher.active && !expired && !exhausted ? t("admin.vouchers.active") : t("common.status")}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {voucher.type === "percent"
                        ? `${voucher.value}%`
                        : formatCurrency(voucher.value, locale)}
                      {voucher.maxDiscount ? ` · ${t("admin.vouchers.maxDiscount")} ${formatCurrency(voucher.maxDiscount, locale)}` : ""}
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      {t("admin.vouchers.usage")}: {voucher.usedCount}/
                      {voucher.usageLimit ?? t("admin.vouchers.unlimited")} ·{" "}
                      {formatDate(voucher.validFrom, locale)} – {formatDate(voucher.validUntil, locale)}
                      {voucher.minAmount ? ` · ${t("admin.vouchers.minAmount")} ${formatCurrency(voucher.minAmount, locale)}` : ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="icon-sm" variant="ghost" aria-label={t("common.edit")} onClick={() => openEdit(voucher)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("common.delete")}
                      onClick={() => handleDelete(voucher)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("admin.vouchers.editVoucher") : t("admin.vouchers.newVoucher")}</DialogTitle>
            <DialogDescription>{t("admin.vouchers.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="voucher-code">{t("admin.vouchers.code")}</Label>
              <Input
                id="voucher-code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/\s/g, "") })}
                placeholder="PERKASA10"
                className="font-mono tracking-wider uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="voucher-type">{t("admin.vouchers.type")}</Label>
                <NativeSelect
                  ariaLabel={t("admin.vouchers.type")}
                  className="h-11 w-full text-sm"
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as VoucherForm["type"] })}
                  options={[
                    { value: "percent", label: t("admin.vouchers.percent") },
                    { value: "amount", label: t("admin.vouchers.amount") },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-value">{t("admin.vouchers.value")}</Label>
                <Input
                  id="voucher-value"
                  inputMode="numeric"
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value.replace(/[^0-9]/g, "") })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-min">{t("admin.vouchers.minAmount")}</Label>
                <Input
                  id="voucher-min"
                  inputMode="numeric"
                  value={form.minAmount}
                  onChange={(event) => setForm({ ...form, minAmount: event.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-max">{t("admin.vouchers.maxDiscount")}</Label>
                <Input
                  id="voucher-max"
                  inputMode="numeric"
                  value={form.maxDiscount}
                  onChange={(event) => setForm({ ...form, maxDiscount: event.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-limit">{t("admin.vouchers.usage")}</Label>
                <Input
                  id="voucher-limit"
                  inputMode="numeric"
                  value={form.usageLimit}
                  onChange={(event) => setForm({ ...form, usageLimit: event.target.value.replace(/[^0-9]/g, "") })}
                  placeholder={t("admin.vouchers.unlimited")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-days">{t("admin.vouchers.validity")}</Label>
                <Input
                  id="voucher-days"
                  inputMode="numeric"
                  value={form.days}
                  onChange={(event) => setForm({ ...form, days: event.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="30"
                />
              </div>
            </div>

            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
              <span className="text-sm">{t("admin.vouchers.active")}</span>
              <Switch
                checked={form.active}
                onCheckedChange={(value) => setForm({ ...form, active: value })}
                aria-label={t("admin.vouchers.active")}
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={pending || !form.code.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("admin.vouchers.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
