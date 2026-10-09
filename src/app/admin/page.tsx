"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  ClipboardList,
  CreditCard,
  Gauge,
  HelpCircle,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { formatCompact, formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useCurrentUser } from "@/lib/store/auth";
import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const { t, tx, locale } = useI18n();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const user = useCurrentUser();

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const participants = db.users.filter((item) => item.role === "participant");
  const approved = db.payments.filter((payment) => payment.status === "approved");
  const revenue = approved.reduce((sum, payment) => sum + payment.total - payment.discount, 0);
  const pending = db.payments.filter((payment) => payment.status === "pending");
  const finishedAttempts = db.attempts.filter((attempt) => attempt.result);
  const published = db.packages.filter((pkg) => pkg.status === "published");

  const stats = [
    {
      icon: Users,
      label: t("admin.statUsers"),
      value: formatNumber(db.users.length, locale),
      hint: `${formatNumber(participants.length, locale)} ${t("roles.participant")}`,
      tint: "text-indigo-600 bg-indigo-500/10",
    },
    {
      icon: Wallet,
      label: t("admin.statRevenue"),
      value: formatCurrency(revenue, locale),
      hint: t("admin.trendUp", { value: "+18%" }),
      tint: "text-emerald-600 bg-emerald-500/10",
    },
    {
      icon: CreditCard,
      label: t("admin.statPending"),
      value: formatNumber(pending.length, locale),
      hint: t("admin.pendingBadge", { count: pending.length }),
      tint: "text-amber-600 bg-amber-500/10",
    },
    {
      icon: ClipboardList,
      label: t("admin.statAttempts"),
      value: formatNumber(finishedAttempts.length, locale),
      hint: t("admin.statPackages"),
      tint: "text-sky-600 bg-sky-500/10",
    },
    {
      icon: Boxes,
      label: t("admin.statPackages"),
      value: formatNumber(published.length, locale),
      hint: `${formatNumber(db.packages.length, locale)} ${t("common.total")}`,
      tint: "text-violet-600 bg-violet-500/10",
    },
    {
      icon: HelpCircle,
      label: t("admin.statQuestions"),
      value: formatNumber(db.questions.length, locale),
      hint: t("nav.questionBank"),
      tint: "text-rose-600 bg-rose-500/10",
    },
  ];

  const popular = [...published].sort((a, b) => b.participantCount - a.participantCount).slice(0, 5);
  const maxParticipants = Math.max(1, ...popular.map((pkg) => pkg.participantCount));
  const recentPayments = [...db.payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentActivity = [...db.activityLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Gauge className="size-5 text-primary" />
            {t("admin.dashboardTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user ? t("admin.greetingSubtitle") : t("admin.dashboardSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/admin/paket">
              <Boxes className="size-4" />
              {t("admin.newPackage")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/pembayaran">
              <CreditCard className="size-4" />
              {t("admin.verifyPayments")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="gap-2">
              <CardContent className="flex items-start gap-3">
                <span className={`flex size-10 items-center justify-center rounded-xl ${stat.tint}`}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="truncate text-lg font-bold">{stat.value}</p>
                  <p className="truncate text-[0.6875rem] text-muted-foreground">{stat.hint}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.popularTryouts")}</CardTitle>
            <CardDescription>{t("admin.statAttempts")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {popular.map((pkg) => (
              <div key={pkg.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{tx(pkg.title)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatCompact(pkg.participantCount, locale)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                    style={{ width: `${Math.max(6, (pkg.participantCount / maxParticipants) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {popular.length === 0 && <p className="text-sm text-muted-foreground">{t("common.empty")}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.recentPayments")}</CardTitle>
            <CardDescription>{t("payment.title")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPayments.map((payment) => {
              const pkg = db.packages.find((item) => item.id === payment.packageId);
              const payer = db.users.find((item) => item.id === payment.userId);
              return (
                <div key={payment.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{payer?.name ?? payment.userId}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {pkg ? tx(pkg.title) : payment.invoiceCode} · {formatDateTime(payment.createdAt, locale)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold">{formatCurrency(payment.total, locale)}</span>
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
                </div>
              );
            })}
            {recentPayments.length === 0 && <p className="text-sm text-muted-foreground">{t("payment.empty")}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.recentActivity")}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <TrendingUp className="size-3.5" />
            {t("nav.activityLog")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recentActivity.map((log) => (
              <li key={log.id} className="flex items-start gap-2 text-sm">
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{log.userName}</span>{" "}
                  <span className="text-muted-foreground">{tx(log.message)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
