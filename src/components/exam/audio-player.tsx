"use client";

import { useRef, useState } from "react";
import { Headphones, Play } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { RichContent } from "@/types";
import { Button } from "@/components/ui/button";
import { RichContent as RichContentView } from "@/components/common/rich-content";

/**
 * Listening audio with a play budget (TOEFL: the track may only be played
 * once). The counter is kept locally — the exam engine only stores the answer.
 */
export function AudioPlayer({
  src,
  maxPlays = 1,
  allowSeek = false,
  transcript,
}: {
  src: string;
  maxPlays?: number;
  allowSeek?: boolean;
  transcript?: RichContent;
}) {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playsLeft, setPlaysLeft] = useState(maxPlays);
  const [showTranscript, setShowTranscript] = useState(false);

  function handlePlay() {
    if (playsLeft <= 0) return;
    const audio = audioRef.current;
    if (!audio) return;
    setPlaysLeft((left) => Math.max(0, left - 1));
    void audio.play().catch(() => setPlaysLeft((left) => Math.min(maxPlays, left + 1)));
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
      <audio ref={audioRef} src={src} preload="auto" controls={allowSeek} className={allowSeek ? "w-full" : "hidden"} />
      <div className="flex items-center gap-2">
        {!allowSeek && (
          <Button type="button" variant="outline" size="sm" onClick={handlePlay} disabled={playsLeft <= 0}>
            <Play className="size-4" />
            {t("exam.audioPlay")}
          </Button>
        )}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Headphones className="size-3.5" />
          {playsLeft > 0 ? t("exam.audioPlaysLeft", { count: playsLeft }) : t("exam.audioDone")}
        </span>
        {transcript && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="ml-auto"
            onClick={() => setShowTranscript((value) => !value)}
          >
            {t("exam.transcript")}
          </Button>
        )}
      </div>
      {showTranscript && transcript && (
        <RichContentView content={transcript} dense className="border-t border-border pt-2 text-muted-foreground" />
      )}
    </div>
  );
}

export default AudioPlayer;
