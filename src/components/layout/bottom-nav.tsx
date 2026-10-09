"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, KeyRound, UserRound, type LucideIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const PARTICIPANT_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.home", icon: Home, exact: true },
  { href: "/dashboard/riwayat", labelKey: "nav.history", icon: History },
  { href: "/dashboard/gabung", labelKey: "nav.join", icon: KeyRound },
  { href: "/profil", labelKey: "nav.profile", icon: UserRound },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav({ items = PARTICIPANT_NAV }: { items?: NavItem[] }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-safe md:hidden"
    >
      <ul className="mx-auto flex w-full max-w-6xl items-stretch">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[0.6875rem] font-medium transition-colors",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.4]")} />
                <span className="leading-none">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomNav;
