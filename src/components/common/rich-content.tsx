"use client";

import { useEffect, useMemo, useRef } from "react";
import katex from "katex";
import type { RichContent } from "@/types";
import { useI18n } from "@/lib/i18n";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

interface RichContentProps {
  content?: RichContent | string;
  className?: string;
  /** Rendered inside a dense list (smaller text, tighter spacing). */
  dense?: boolean;
}

/**
 * Renders sanitized rich content (text, lists, tables, images) and upgrades
 * every `<span|div data-math>` node to KaTeX output after mount.
 *
 * Math is authored as `<span data-math="inline">x^2</span>` (or `data-math="block"`),
 * matching what the admin editor will emit when MathLive inserts a formula.
 */
export function RichContent({ content, className, dense }: RichContentProps) {
  const { tx } = useI18n();
  const raw = typeof content === "string" ? content : tx(content);
  const html = useMemo(() => sanitizeHtml(raw), [raw]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>("[data-math]").forEach((node) => {
      const latex = node.getAttribute("data-latex") ?? node.textContent ?? "";
      if (!latex) return;
      const display = node.getAttribute("data-math") === "block" || node.tagName.toLowerCase() === "div";
      try {
        katex.render(latex, node, {
          displayMode: display,
          throwOnError: false,
          strict: "ignore",
          output: "html",
        });
        node.classList.add(display ? "math-block" : "math-inline");
      } catch {
        node.textContent = latex;
      }
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={cn("rich-content", dense && "text-sm", className)}
      // Content is sanitized with an allow-list in `sanitizeHtml` before insertion.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default RichContent;
