/**
 * Tiny allow-list HTML sanitizer.
 *
 * Question content is authored in the admin editor (Tiptap) and stored as an
 * HTML string. It is rendered with `dangerouslySetInnerHTML`, so it must be
 * sanitized first. The implementation is dependency-free and environment
 * agnostic (no DOM), which keeps server and client output identical.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "a",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "span",
  "div",
  "section",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "sup",
  "sub",
  "mark",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  span: new Set(["data-math", "data-latex", "class"]),
  div: new Set(["data-math", "data-latex", "class"]),
  a: new Set(["href", "target", "rel", "class"]),
  img: new Set(["src", "alt", "title", "width", "height", "class"]),
  td: new Set(["colspan", "rowspan", "class"]),
  th: new Set(["colspan", "rowspan", "class"]),
  "*": new Set(["class"]),
};

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeUrl(value: string, tag: string) {
  const url = value.trim().toLowerCase();
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("#")) return true;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) return true;
  if (tag === "img" && url.startsWith("data:image/")) return true;
  return false;
}

function sanitizeAttributes(tag: string, raw: string) {
  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
  const global = ALLOWED_ATTRS["*"];
  let output = "";
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(raw))) {
    const name = match[1].toLowerCase();
    let value = match[2] ?? "";
    if (!allowed.has(name) && !global.has(name)) continue;
    if (name.startsWith("on")) continue;
    if ((name === "src" || name === "href") && !isSafeUrl(value, tag)) continue;
    // Strip quotes for the re-serialization, then re-quote safely.
    if (/^["']/.test(value)) value = value.slice(1, -1);
    output += ` ${name}="${escapeHtml(value)}"`;
  }
  return output;
}

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  const stack: string[] = [];
  let output = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;

  while ((match = TAG_RE.exec(input))) {
    output += escapeHtml(input.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;

    const [, closing, rawTag, rawAttrs, selfClose] = match;
    const tag = rawTag.toLowerCase();
    const isClosing = closing === "/";
    const isVoid = VOID_TAGS.has(tag) || selfClose === "/";

    if (!ALLOWED_TAGS.has(tag)) continue;

    if (isClosing) {
      const index = stack.lastIndexOf(tag);
      if (index >= 0) {
        for (let i = stack.length - 1; i >= index; i--) output += `</${stack[i]}>`;
        stack.length = index;
      }
      continue;
    }

    output += `<${tag}${sanitizeAttributes(tag, rawAttrs ?? "")}${isVoid && !VOID_TAGS.has(tag) ? " /" : ""}>`;
    if (!isVoid) stack.push(tag);
  }

  output += escapeHtml(input.slice(lastIndex));
  for (let i = stack.length - 1; i >= 0; i--) output += `</${stack[i]}>`;
  return output;
}

/** Strips every tag — handy for previews and search indexes. */
export function stripHtml(input: string): string {
  return sanitizeHtml(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
