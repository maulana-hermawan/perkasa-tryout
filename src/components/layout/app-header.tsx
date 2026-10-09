"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/store/auth";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/common/brand";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/components/common/user-menu";
import { useParticipantNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";

export function AppHeader({
  actions,
  /** Show the participant links on wide screens (the tab bar is mobile-only). */
  showDesktopNav = false,
}: {
  actions?: React.ReactNode;
  showDesktopNav?: boolean;
}) {
  const { t } = useI18n();
  const user = useCurrentUser();
  const pathname = usePathname();
  const nav = useParticipantNav();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md pt-safe">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <Brand href={user ? (user.role === "participant" ? "/dashboard" : "/admin") : "/"} />

        {showDesktopNav && user && (
          <nav aria-label={t("nav.mainNavigation")} className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1">
          {actions}
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <UserMenu />
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link href="/login">
                <LogIn className="size-4" />
                {t("auth.loginSubmit")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
