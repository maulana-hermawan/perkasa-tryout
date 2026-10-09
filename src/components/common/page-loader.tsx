import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={cn("flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-primary" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export default PageLoader;
