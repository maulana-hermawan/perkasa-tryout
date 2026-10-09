"use client";

import { ArrowLeft, Cloud, CloudUpload, Loader2, Timer } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { formatDurationClock } from "@/lib/utils";
import type { SaveState } from "@/lib/exam/use-exam-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** Sticky exam chrome: subtest name, countdown, autosave state, exit. */
export function ExamHeader({
  title,
  subtestLabel,
  remaining,
  total,
  answeredCount,
  saveState,
  onExit,
  danger,
}: {
  title: string;
  subtestLabel: string;
  remaining: number;
  total: number;
  answeredCount: number;
  saveState: SaveState;
  onExit: () => void;
  danger?: boolean;
}) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md pt-safe">
      <div className="mx-auto w-full max-w-3xl px-3 pt-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label={t("common.back")} onClick={onExit}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtestLabel}</p>
          </div>
          <Badge variant={danger ? "destructive" : remaining <= 60 ? "warning" : "muted"} className="font-mono text-sm">
            <Timer className="size-3" />
            {formatDurationClock(remaining)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 py-2">
          <Progress
            value={total > 0 ? (answeredCount / total) * 100 : 0}
            aria-label={t("exam.palette")}
            className="h-1.5"
          />
          <span className="flex shrink-0 items-center gap-1 text-[0.6875rem] text-muted-foreground">
            {saveState === "saving" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : saveState === "saved" ? (
              <Cloud className="size-3 text-success" />
            ) : (
              <CloudUpload className="size-3" />
            )}
            {saveState === "saving"
              ? t("exam.saving")
              : saveState === "saved"
                ? t("exam.saved")
                : `${answeredCount}/${total}`}
          </span>
        </div>
      </div>
    </header>
  );
}

export default ExamHeader;
