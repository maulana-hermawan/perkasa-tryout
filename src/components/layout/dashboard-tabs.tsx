"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkCheck, History, KeyRound, LayoutGrid, type LucideIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface DashboardTab {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const DASHBOARD_TABS: DashboardTab[] = [
  { href: "/dashboard", labelKey: "catalog.tabsCatalog", icon: LayoutGrid, exact: true },
  { href: "/dashboard/saya", labelKey: "catalog.tabsMy", icon: BookmarkCheck },
  { href: "/dashboard/riwayat", labelKey: "catalog.tabsHistory", icon: History },
  { href: "/dashboard/gabung", labelKey: "catalog.tabsJoin", icon: KeyRound },
];

export function DashboardTabs() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav aria-label={t("catalog.title")} className="-mx-4 overflow-x-auto px-4 no-scrollbar md:hidden">
      <ul className="flex w-full min-w-max gap-2 sm:min-w-0">
        {DASHBOARD_TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {t(tab.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default DashboardTabs;
