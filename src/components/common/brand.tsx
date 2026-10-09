import Link from "next/link";
import { Target } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm",
        className,
      )}
    >
      <Target className="size-[18px]" strokeWidth={2.4} />
    </span>
  );
}

export function Brand({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)}
    >
      <BrandMark />
      {showWordmark && (
        <span className="text-[1.0625rem] leading-none font-bold tracking-tight">
          Tryout<span className="text-primary">Ku</span>
        </span>
      )}
    </Link>
  );
}

export default Brand;
