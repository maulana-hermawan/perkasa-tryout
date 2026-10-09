"use client";

import { AlertTriangle, Flag, Send } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Last checkpoint before the attempt is graded. */
export function SubmitDialog({
  open,
  onOpenChange,
  unanswered,
  marked,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unanswered: number;
  marked: number;
  submitting: boolean;
  onConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("exam.submitTitle")}</DialogTitle>
          <DialogDescription>{t("exam.submitDescription")}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          {unanswered > 0 && (
            <li className="flex items-center gap-2 rounded-lg bg-warning/15 p-2.5 text-warning-foreground">
              <AlertTriangle className="size-4 shrink-0" />
              {t("exam.unansweredCount", { count: unanswered })}
            </li>
          )}
          {marked > 0 && (
            <li className="flex items-center gap-2 rounded-lg bg-muted p-2.5">
              <Flag className="size-4 shrink-0" />
              {t("exam.markedCount", { count: marked })}
            </li>
          )}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("exam.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            <Send className="size-4" />
            {t("exam.submitConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SubmitDialog;
