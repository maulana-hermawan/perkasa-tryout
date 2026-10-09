import { AuthGuard } from "@/components/common/auth-guard";

/**
 * Focus mode: the exam room deliberately drops the app chrome (bottom tab bar
 * and marketing header) so nothing on screen competes with the timer.
 */
export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={["participant", "host", "admin"]}>
      <div className="flex min-h-dvh flex-col bg-muted/20">{children}</div>
    </AuthGuard>
  );
}
