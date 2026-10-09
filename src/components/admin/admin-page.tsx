"use client";

import { Search } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/exam/native-select";

/** Consistent page chrome for every admin section. */
export function AdminPageHeader({
  title,
  subtitle,
  actions,
  count,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  count?: number;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {subtitle}
          {typeof count === "number" && ` · ${t("admin.questions.count", { count })}`}
        </p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Search box with an optional row of filter selects. */
export function AdminToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={t("common.search")}
          className="pl-9"
        />
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function AdminFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <NativeSelect
      ariaLabel={label}
      className="h-11 min-w-36 flex-1 text-sm sm:flex-none"
      placeholder={label}
      value={value}
      onValueChange={onChange}
      options={options}
    />
  );
}

/** Shared row layout: leading slot, main content, meta, actions. */
export function AdminRow({ children }: { children: React.ReactNode }) {
  return <li className="rounded-2xl border border-border bg-card p-3 shadow-card">{children}</li>;
}

export function AdminEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
