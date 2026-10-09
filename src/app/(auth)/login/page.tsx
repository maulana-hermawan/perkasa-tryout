"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { DEMO_CREDENTIALS } from "@/lib/seed";
import { useAuthStore } from "@/lib/store/auth";
import { PageLoader } from "@/components/common/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@/types";

const DEMO_ACCOUNTS: { role: Role; labelKey: string; icon: typeof UserRound; tint: string; credential: { email: string; password: string } }[] = [
  {
    role: "participant",
    labelKey: "auth.demoParticipant",
    icon: UserRound,
    tint: "hover:border-emerald-500/50 hover:bg-emerald-500/5",
    credential: DEMO_CREDENTIALS.participant,
  },
  {
    role: "host",
    labelKey: "auth.demoHost",
    icon: UserRound,
    tint: "hover:border-sky-500/50 hover:bg-sky-500/5",
    credential: DEMO_CREDENTIALS.host,
  },
  {
    role: "admin",
    labelKey: "auth.demoAdmin",
    icon: ShieldCheck,
    tint: "hover:border-indigo-500/50 hover:bg-indigo-500/5",
    credential: DEMO_CREDENTIALS.admin,
  },
];

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const login = useAuthStore((state) => state.login);
  const pending = useAuthStore((state) => state.pending);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: { email: string; password: string }) {
    setError(null);
    const result = await login(values.email, values.password);
    if (!result.ok) {
      setError(
        result.reason === "suspended" ? t("auth.errorAccountSuspended") : t("auth.errorInvalidCredentials"),
      );
      return;
    }
    toast.success(t("auth.welcomeBack", { name: result.user.name }));
    const role = result.user.role;
    const fallback = role === "participant" ? "/dashboard" : "/admin";
    router.replace(next && next.startsWith("/") ? next : fallback);
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-xl">{t("auth.loginTitle")}</CardTitle>
        <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!email.trim()) return setError(t("auth.errorEmailRequired"));
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t("auth.errorEmailInvalid"));
            if (!password) return setError(t("auth.errorPasswordRequired"));
            void handleSubmit({ email, password });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {pending ? t("auth.loggingIn") : t("auth.loginSubmit")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t("auth.registerLink")}
          </Link>
        </p>

        <div className="relative py-1">
          <Separator />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            {t("auth.demoTitle")}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("auth.demoHint")}</p>
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            return (
              <button
                key={account.role}
                type="button"
                disabled={pending}
                onClick={() => {
                  setEmail(account.credential.email);
                  setPassword(account.credential.password);
                  void handleSubmit(account.credential);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${account.tint}`}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t(account.labelKey)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{account.credential.email}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginForm />
    </Suspense>
  );
}
