"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { dataSource } from "@/lib/repositories";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import type { AppSettings, PaymentMethod } from "@/types";
import { PageLoader } from "@/components/common/page-loader";
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
import { useTheme } from "next-themes";
import { useCurrentUser } from "@/lib/store/auth";

const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "UTC"];

export default function AdminSettingsPage() {
  const { t, tx, locale, setLocale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const { theme, setTheme } = useTheme();
  const user = useCurrentUser();

  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [pending, setPending] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // The database is the source of truth until the admin edits a field.
  const form = draft ?? db.settings;
  const update = (patch: Partial<AppSettings>) => setDraft({ ...form, ...patch });

  if (!hydrated) return <PageLoader />;

  async function handleSave() {
    setPending(true);
    try {
      await dataSource.settings.update(form);
      setDraft(null);
      toast.success(t("admin.settings.savedToast"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await dataSource.resetDatabase();
      setDraft(null);
      setResetOpen(false);
      toast.success(t("admin.settings.resetToast"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setResetting(false);
    }
  }

  function toggleMethod(method: PaymentMethod, active: boolean) {
    update({
      paymentMethods: form.paymentMethods.map((item) => (item.id === method.id ? { ...item, active } : item)),
    });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("admin.settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.settings.subtitle")}</p>
      </header>

      {/* Branding */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("admin.settings.brandSection")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">{t("admin.settings.brandName")}</Label>
            <Input
              id="brand-name"
              value={form.brandName}
              onChange={(event) => update({ brandName: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-tagline">{t("admin.settings.tagline")}</Label>
            <Input
              id="brand-tagline"
              value={tx(form.tagline)}
              onChange={(event) => update({ tagline: { id: event.target.value, en: event.target.value } })}
            />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("admin.settings.contactSection")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">{t("admin.settings.contactEmail")}</Label>
            <Input
              id="contact-email"
              type="email"
              value={form.contactEmail}
              onChange={(event) => update({ contactEmail: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-wa">{t("admin.settings.contactWhatsapp")}</Label>
            <Input
              id="contact-wa"
              value={form.contactWhatsapp}
              onChange={(event) => update({ contactWhatsapp: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">{t("admin.settings.website")}</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(event) => update({ website: event.target.value })}
            />
          </div>
        </div>
      </section>

      {/* System */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("admin.settings.systemSection")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="default-locale">{t("admin.settings.defaultLocale")}</Label>
            <NativeSelect
              ariaLabel={t("admin.settings.defaultLocale")}
              className="h-11 w-full text-sm"
              value={form.defaultLocale}
              onValueChange={(value) => update({ defaultLocale: value as AppSettings["defaultLocale"] })}
              options={[
                { value: "id", label: "Bahasa Indonesia" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">{t("admin.settings.timezone")}</Label>
            <NativeSelect
              ariaLabel={t("admin.settings.timezone")}
              className="h-11 w-full text-sm"
              value={form.timezone}
              onValueChange={(value) => update({ timezone: value })}
              options={TIMEZONES.map((zone) => ({ value: zone, label: zone }))}
            />
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
            <span className="text-sm">
              {t("admin.settings.autoApprove")}
              <span className="block text-xs text-muted-foreground">{t("admin.settings.autoApproveHint")}</span>
            </span>
            <Switch
              checked={form.autoApprovePayments}
              onCheckedChange={(value) => update({ autoApprovePayments: value })}
              aria-label={t("admin.settings.autoApprove")}
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
            <span className="text-sm">
              {t("admin.settings.maintenance")}
              <span className="block text-xs text-muted-foreground">{t("admin.settings.maintenanceHint")}</span>
            </span>
            <Switch
              checked={form.maintenanceMode}
              onCheckedChange={(value) => update({ maintenanceMode: value })}
              aria-label={t("admin.settings.maintenance")}
            />
          </label>
        </div>
      </section>

      {/* Payment methods */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">{t("admin.settings.paymentSection")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("admin.settings.paymentMethods")}</p>
        <ul className="space-y-2">
          {form.paymentMethods.map((method) => (
            <li key={method.id}>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{method.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {method.kind} · {method.accountNumber}
                  </span>
                </span>
                <Switch
                  checked={method.active}
                  onCheckedChange={(value) => toggleMethod(method, value)}
                  aria-label={`${method.name} — ${t("admin.settings.methodActive")}`}
                />
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* This admin's own preferences */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("profile.preferences")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="my-locale">{t("language.label")}</Label>
            <NativeSelect
              ariaLabel={t("language.label")}
              className="h-11 w-full text-sm"
              value={locale}
              onValueChange={(value) => setLocale(value as "id" | "en")}
              options={[
                { value: "id", label: "Bahasa Indonesia" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="my-theme">{t("theme.label")}</Label>
            <NativeSelect
              ariaLabel={t("theme.label")}
              className="h-11 w-full text-sm"
              value={theme ?? "system"}
              onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
              options={[
                { value: "light", label: t("theme.light") },
                { value: "dark", label: t("theme.dark") },
                { value: "system", label: t("theme.system") },
              ]}
            />
          </div>
        </div>
        {user && <p className="mt-2 text-xs text-muted-foreground">{user.email}</p>}
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {t("admin.settings.save")}
        </Button>
      </div>

      {/* Danger zone */}
      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="size-4" />
          {t("admin.settings.dangerZone")}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("admin.settings.resetDescription")}</p>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setResetOpen(true)}>
          <RotateCcw className="size-4" />
          {t("admin.settings.resetData")}
        </Button>
      </section>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.settings.resetTitle")}</DialogTitle>
            <DialogDescription>{t("admin.settings.resetDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {t("admin.settings.resetConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
