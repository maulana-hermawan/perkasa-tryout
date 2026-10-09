"use client";

import Link from "next/link";
import { BarChart3, Clock, LogOut, Mail, School, ShieldCheck, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { formatDate, formatNumber } from "@/lib/format";
import { useAuthStore, useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDurationClock, initials } from "@/lib/utils";

export default function ProfilePage() {
  const { t, tx, locale } = useI18n();
  const user = useCurrentUser();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  if (!hydrated || !user) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const attempts = db.attempts.filter((attempt) => attempt.userId === user.id);
  const finished = attempts.filter((attempt) => attempt.result);
  const average = finished.length
    ? Math.round(finished.reduce((sum, attempt) => sum + (attempt.result?.percentage ?? 0), 0) / finished.length)
    : 0;
  const totalSeconds = finished.reduce((sum, attempt) => sum + (attempt.result?.durationSeconds ?? 0), 0);
  const payments = db.payments.filter((payment) => payment.userId === user.id);

  return (
    <section className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarFallback style={{ backgroundColor: user.avatarColor }} className="text-lg text-white">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{t(`roles.${user.role}`)}</Badge>
              <Badge variant="muted">{t("profile.memberSince", { date: formatDate(user.createdAt, locale) })}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Target} label={t("profile.statsAttempts")} value={formatNumber(attempts.length, locale)} />
        <StatCard icon={BarChart3} label={t("profile.statsAverage")} value={`${average}%`} />
        <StatCard icon={Clock} label={t("profile.statsHours")} value={formatDurationClock(totalSeconds)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row icon={Mail} label={t("profile.emailLabel")} value={user.email} />
          <Row icon={School} label={t("profile.institutionLabel")} value={user.institution ?? "-"} />
          <Row icon={ShieldCheck} label={t("profile.roleLabel")} value={t(`roles.${user.role}`)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile.preferences")}</CardTitle>
          <CardDescription>{t("language.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium">{t("language.label")}</p>
              <p className="text-xs text-muted-foreground">{t("language.autoDetected")}</p>
            </div>
            <LanguageToggle variant="outline" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium">{t("theme.label")}</p>
              <p className="text-xs text-muted-foreground">{t("theme.description")}</p>
            </div>
            <ThemeToggle variant="outline" />
          </div>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("nav.payments")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.slice(0, 4).map((payment) => {
              const pkg = db.packages.find((item) => item.id === payment.packageId);
              return (
                <div key={payment.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pkg ? tx(pkg.title) : payment.invoiceCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.invoiceCode} · {formatDate(payment.createdAt, locale)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payment.status === "approved"
                        ? "success"
                        : payment.status === "pending"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {t(`payment.status.${payment.status}`)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-2">
        {user.role !== "participant" && (
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin">{t("nav.dashboard")}</Link>
          </Button>
        )}
        <Button
          variant="destructive"
          className="w-full"
          onClick={async () => {
            await logout();
            toast.success(t("auth.logoutSuccess"));
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          {t("nav.logout")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t("profile.demoNotice")}</p>
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <Card className="items-center justify-center gap-1 py-3 text-center">
      <Icon className="size-4 text-primary" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[0.6875rem] leading-tight text-muted-foreground">{label}</p>
    </Card>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{value}</span>
    </div>
  );
}
