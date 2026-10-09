"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Mark, mergeAttributes } from "@tiptap/core";
import {
  Bold,
  Code2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Sigma,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Inline math mark.
 *
 * Rendered as `<span data-math="inline" data-latex="…">`, which is exactly what
 * `RichContent` upgrades to KaTeX and what `sanitizeHtml` allows through.
 */
const MathMark = Mark.create({
  name: "math",
  inclusive: false,
  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") ?? element.textContent ?? "",
        renderHTML: (attributes) => ({
          "data-math": "inline",
          "data-latex": String(attributes.latex ?? ""),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-math]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "math-source" }), 0];
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Compact variant for option text (single paragraph). */
  dense?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  dense = false,
  className,
  ariaLabel,
}: RichTextEditorProps) {
  const { t } = useI18n();
  const [latex, setLatex] = useState("");
  const [mathOpen, setMathOpen] = useState(false);
  // The latest callback is handed to Tiptap through a ref so the editor is
  // never recreated (which would reset the cursor on every keystroke).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    // Next.js renders on the server first — creating the editor immediately
    // would mismatch the DOM.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: dense ? false : { levels: [2, 3] },
        link: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      MathMark,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn("rich-content tiptap min-h-20 outline-none", dense && "min-h-11 text-sm"),
        "aria-label": ariaLabel ?? placeholder ?? t("admin.editor.prompt"),
      },
    },
    onUpdate: ({ editor: instance }) => onChangeRef.current(instance.getHTML()),
  });

  // Keep the editor in sync when the parent swaps documents (e.g. "reset").
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const insertMath = useCallback(() => {
    if (!editor) return;
    const source = latex.trim();
    if (!source) return;
    editor.chain().focus().insertContent({ type: "text", text: source }).setMark("math", { latex: source }).run();
    setLatex("");
    setMathOpen(false);
  }, [editor, latex]);

  if (!editor) {
    return <div className={cn("min-h-20 animate-pulse rounded-xl border border-border bg-muted/40", className)} />;
  }

  const tools = [
    { icon: Bold, label: t("admin.editor.bold"), active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: t("admin.editor.italic"), active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { icon: UnderlineIcon, label: t("admin.editor.underline"), active: editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
    { icon: Strikethrough, label: t("admin.editor.strike"), active: editor.isActive("strike"), run: () => editor.chain().focus().toggleStrike().run() },
    { icon: Code2, label: t("admin.editor.code"), active: editor.isActive("code"), run: () => editor.chain().focus().toggleCode().run() },
    { icon: List, label: t("admin.editor.bulletList"), active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: t("admin.editor.orderedList"), active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, label: t("admin.editor.quote"), active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
        {tools.map((tool) => (
          <Button
            key={tool.label}
            type="button"
            size="icon-sm"
            variant={tool.active ? "secondary" : "ghost"}
            aria-label={tool.label}
            aria-pressed={tool.active}
            onClick={tool.run}
          >
            <tool.icon className="size-4" />
          </Button>
        ))}

        <Button
          type="button"
          size="icon-sm"
          variant={mathOpen || editor.isActive("math") ? "secondary" : "ghost"}
          aria-label={t("admin.editor.formula")}
          aria-expanded={mathOpen}
          onClick={() => setMathOpen((open) => !open)}
        >
          <Sigma className="size-4" />
        </Button>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t("admin.editor.undo")}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t("admin.editor.redo")}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" />
          </Button>
        </div>
      </div>

      {mathOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/40 p-2">
          <Input
            value={latex}
            onChange={(event) => setLatex(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertMath();
              }
            }}
            placeholder="x^2 + y^2 = z^2"
            className="h-9 min-w-0 flex-1 font-mono text-sm"
            aria-label={t("admin.editor.formulaTitle")}
          />
          <Button type="button" size="sm" onClick={insertMath} disabled={!latex.trim()}>
            {t("admin.editor.insertFormula")}
          </Button>
        </div>
      )}

      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;
