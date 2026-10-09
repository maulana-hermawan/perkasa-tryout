"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/store/auth";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/common/brand";
import { UserMenu } from "@/components/common/user-menu";
import { AuthGuard } from "@/components/common/auth-guard";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ADMIN_BOTTOM_NAV, ADMIN_NAV, type AdminNavItem } from "./admin-nav";

function isItemActive(pathname: string, item: AdminNavItem) {
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <div className="px-2 py-3">
        <Brand />
      </div>

      {ADMIN_NAV.map((group) => (
        <div key={group.titleKey} className="mb-2">
          <p className="px-3 pb-1 pt-3 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
            {t(group.titleKey)}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isItemActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4.5" />
                    <span className="truncate">{t(item.labelKey)}</span>
                    {!item.ready && !active && (
                      <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
                        {t("common.comingSoon")}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto space-y-2 pt-4">
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            {t("admin.quickActions")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("profile.demoNotice")}</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 rounded-xl border border-border p-2">
            <UserMenu />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{t(`roles.${user.role}`)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminBottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-safe md:hidden"
    >
      <ul className="flex items-stretch">
        {ADMIN_BOTTOM_NAV.map((item) => {
          const active = isItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.625rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="leading-none">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <AuthGuard roles={["admin", "host"]}>
      <div className="min-h-dvh md:flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-sidebar md:block">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            actions={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setOpen(true)}
                aria-label={t("nav.openMenu")}
              >
                <Menu className="size-5" />
              </Button>
            }
          />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-6 md:pb-10">{children}</main>
        </div>

        <AdminBottomNav />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[17rem] p-0 sm:max-w-[17rem]">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("nav.menu")}</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </AuthGuard>
  );
}

export default AdminShell;
