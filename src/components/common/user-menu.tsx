"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { useAuthStore, useCurrentUser } from "@/lib/store/auth";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { t } = useI18n();
  const user = useCurrentUser();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full p-1 pr-2 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Avatar className="size-8">
          <AvatarFallback style={{ backgroundColor: user.avatarColor }} className="text-white">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel>
          <span className="block truncate font-semibold text-foreground">{user.name}</span>
          <span className="block truncate text-xs font-normal">{user.email}</span>
          <span className="mt-1 block text-xs font-normal text-primary">{t(`roles.${user.role}`)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profil" className="gap-2">
            <UserRound className="size-4" />
            {t("nav.profile")}
          </Link>
        </DropdownMenuItem>
        {user.role !== "participant" && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="gap-2">
              <LayoutDashboard className="size-4" />
              {t("nav.dashboard")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          variant="destructive"
          onClick={async () => {
            await logout();
            toast.success(t("auth.logoutSuccess"));
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
