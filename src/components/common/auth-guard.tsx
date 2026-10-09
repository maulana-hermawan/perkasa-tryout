"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/types";
import { useAuthStore, useCurrentUser } from "@/lib/store/auth";
import { useDbHydrated } from "@/lib/store/db";
import { PageLoader } from "@/components/common/page-loader";

/**
 * Client-side route protection. A real deployment would repeat these checks in
 * middleware / RLS policies on the server — here the mock backend lives in the
 * browser, so the guard runs after hydration.
 */
export function AuthGuard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const user = useCurrentUser();
  const dbHydrated = useDbHydrated();
  const authHydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const pathname = usePathname();

  const ready = dbHydrated && authHydrated;
  const allowed = ready && user && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(user.role === "participant" ? "/dashboard" : "/admin");
    }
  }, [ready, user, roles, router, pathname]);

  if (!allowed) return <PageLoader />;

  return <>{children}</>;
}

export default AuthGuard;
