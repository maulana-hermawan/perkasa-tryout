"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/store/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/password-input";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const pending = useAuthStore((state) => state.pending);

  const [form, setForm] = useState({ name: "", email: "", institution: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError(t("auth.errorNameRequired"));
    if (!form.email.trim()) return setError(t("auth.errorEmailRequired"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError(t("auth.errorEmailInvalid"));
    if (form.password.length < 6) return setError(t("auth.errorPasswordShort"));
    if (form.password !== form.confirm) return setError(t("auth.errorPasswordMismatch"));

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      institution: form.institution,
    });

    if (!result.ok) {
      setError(result.reason === "email-taken" ? t("auth.errorEmailTaken") : t("common.error"));
      return;
    }

    toast.success(t("auth.welcomeBack", { name: result.user.name }));
    router.replace("/dashboard");
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.registerTitle")}</CardTitle>
        <CardDescription>
          {t("auth.registerSubtitle")}{" "}
          <span className="font-medium text-primary">{t("auth.registerCta")}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("auth.nameLabel")}</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder={t("auth.namePlaceholder")}
              value={form.name}
              onChange={update("name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t("auth.emailPlaceholder")}
              value={form.email}
              onChange={update("email")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="institution">
              {t("auth.institutionLabel")}
              <span className="text-xs font-normal text-muted-foreground"> · {t("common.optional")}</span>
            </Label>
            <Input
              id="institution"
              placeholder={t("auth.institutionPlaceholder")}
              value={form.institution}
              onChange={update("institution")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={form.password}
              onChange={update("password")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("auth.confirmPasswordLabel")}</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={form.confirm}
              onChange={update("confirm")}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {t("auth.registerSubmit")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("auth.loginLink")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
