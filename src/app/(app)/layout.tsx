import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthGuard } from "@/components/common/auth-guard";

/**
 * Participant shell: a sticky top bar, a content area with room for the bottom
 * navigation, and a thumb-reachable tab bar (mobile-first).
 */
export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={["participant", "host", "admin"]}>
      <div className="flex min-h-dvh flex-col">
        <AppHeader showDesktopNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-6 md:pb-10">{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
