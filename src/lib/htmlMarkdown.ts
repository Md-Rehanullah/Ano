/**
 * Tiny two-way bridge between the WYSIWYG editor's HTML and the Markdown we
 * store in the database. Keeps storage compatible with existing posts while
 * hiding markup characters (**, *, ##, `) from the user.
 */

const escapeMd = (s: string) => s.replace(/([\\`*_[\]#>])/g, "\\$1");

const inline = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return escapeMd(node.textContent || "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const kids = Array.from(el.childNodes).map(inline).join("");
  switch (el.tagName) {
    case "BR": return "\n";
    case "B":
    case "STRONG": return kids.trim() ? `**${kids}**` : kids;
    case "I":
    case "EM": return kids.trim() ? `*${kids}*` : kids;
    case "CODE": return kids.trim() ? `\`${kids.replace(/\\`/g, "`")}\`` : kids;
    case "A": {
      const href = el.getAttribute("href") || "";
      return href ? `[${kids}](${href})` : kids;
    }
    default: return kids;
  }
};

const blockToMd = (el: HTMLElement): string => {
  const tag = el.tagName;
  if (/^H[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    return `${"#".repeat(level)} ${inline(el).trim()}`;
  }
  if (tag === "UL" || tag === "OL") {
    return Array.from(el.children)
      .filter((c) => c.tagName === "LI")
      .map((li, i) => `${tag === "OL" ? `${i + 1}.` : "-"} ${inline(li).trim()}`)
      .join("\n");
  }
  if (tag === "BLOCKQUOTE") {
    return inline(el).trim().split("\n").map((l) => `> ${l}`).join("\n");
  }
  if (tag === "PRE") {
    return "```\n" + (el.textContent || "").replace(/\n$/, "") + "\n```";
  }
  return inline(el).trim();
};

export const htmlToMarkdown = (html: string): string => {
  const root = document.createElement("div");
  root.innerHTML = html;

  const blocks: string[] = [];
  let buffer: Node[] = [];
  const flush = () => {
    if (!buffer.length) return;
    const text = buffer.map(inline).join("").trim();
    if (text) blocks.push(text);
    buffer = [];
  };

  for (const node of Array.from(root.childNodes)) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      ["DIV", "P", "UL", "OL", "BLOCKQUOTE", "PRE", "H1", "H2", "H3", "H4", "H5", "H6"].includes(
        (node as HTMLElement).tagName,
      )
    ) {
      flush();
      const md = blockToMd(node as HTMLElement);
      blocks.push(md);
    } else {
      buffer.push(node);
    }
  }
  flush();

  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inlineToHtml = (s: string) =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\\([\\`*_[\]#>])/g, "$1");

/** Converts stored Markdown back into editable HTML (used to resume drafts / edit posts). */
export const markdownToHtml = (md: string): string => {
  if (!md.trim()) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const closeList = () => {
    if (!list) return;
    out.push(`<${list.type}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${list.type}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (bullet) {
      if (!list || list.type !== "ul") { closeList(); list = { type: "ul", items: [] }; }
      list.items.push(inlineToHtml(bullet[1]));
      continue;
    }
    if (ordered) {
      if (!list || list.type !== "ol") { closeList(); list = { type: "ol", items: [] }; }
      list.items.push(inlineToHtml(ordered[1]));
      continue;
    }
    closeList();

    if (!line.trim()) continue;
    if (heading) { out.push(`<h${heading[1].length}>${inlineToHtml(heading[2])}</h${heading[1].length}>`); continue; }
    if (quote) { out.push(`<blockquote>${inlineToHtml(quote[1])}</blockquote>`); continue; }
    out.push(`<div>${inlineToHtml(line)}</div>`);
  }
  closeList();
  return out.join("");
};
