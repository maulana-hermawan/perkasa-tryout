"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Password field with a show/hide toggle — a small thing that prevents typos. */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        title={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export default PasswordInput;
