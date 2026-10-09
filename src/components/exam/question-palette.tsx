"use client";

import type { AnswerRecord } from "@/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Wayground/Quizizz style navigator: every question is one tap away and the
 * colour tells the participant what still needs attention.
 */
export function QuestionPalette({
  open,
  onOpenChange,
  ids,
  answers,
  index,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  answers: Record<string, AnswerRecord>;
  index: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useI18n();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader>
          <SheetTitle>{t("exam.palette")}</SheetTitle>
          <SheetDescription>{t("exam.paletteDescription")}</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-6 gap-2 overflow-y-auto px-4 sm:grid-cols-8">
          {ids.map((id, position) => {
            const record = answers[id];
            const answered = Boolean(record?.value);
            const marked = Boolean(record?.marked);
            const current = position === index;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelect(position);
                  onOpenChange(false);
                }}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "flex size-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  current && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                  marked && answered && "border-warning bg-warning/20 text-warning-foreground",
                  marked && !answered && "border-warning bg-warning/10 text-warning-foreground",
                  !marked && answered && "border-success bg-success/15 text-success",
                  !marked && !answered && "border-border bg-background text-muted-foreground",
                )}
              >
                {position + 1}
              </button>
            );
          })}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pb-4 pt-2 text-xs text-muted-foreground">
          <Legend className="border-success bg-success/15" label={t("exam.legendAnswered")} />
          <Legend className="border-border bg-background" label={t("exam.legendUnanswered")} />
          <Legend className="border-warning bg-warning/20" label={t("exam.legendMarked")} />
          <Legend className="border-border bg-background ring-2 ring-ring" label={t("exam.legendCurrent")} />
        </ul>
      </SheetContent>
    </Sheet>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("size-3.5 rounded border", className)} />
      {label}
    </li>
  );
}

export default QuestionPalette;
