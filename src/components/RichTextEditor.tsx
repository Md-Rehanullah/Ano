import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Code, Quote, Heading2 } from "lucide-react";
import { htmlToMarkdown, markdownToHtml } from "@/lib/htmlMarkdown";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxLength?: number;
  id?: string;
  /** Called with image/GIF files pasted (e.g. from the mobile keyboard GIF picker) or dropped. */
  onPasteFiles?: (files: File[]) => void;
}

type Cmd = { icon: any; label: string; run: () => void };

/**
 * WYSIWYG editor: users click B / I / etc. and type formatted text directly —
 * no markup characters are ever shown. Content is stored as Markdown.
 */
const RichTextEditor = ({ value, onChange, placeholder, minHeight = "120px", maxLength, id, onPasteFiles }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  const [empty, setEmpty] = useState(!value.trim());
  const [, forceTick] = useState(0);

  // Sync external value in (initial load, draft restore, clear).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === lastEmitted.current) return;
    el.innerHTML = markdownToHtml(value);
    lastEmitted.current = value;
    setEmpty(!value.trim());
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const md = htmlToMarkdown(el.innerHTML);
    lastEmitted.current = md;
    setEmpty(!el.textContent?.trim());
    onChange(md);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    forceTick((t) => t + 1);
    emit();
  };

  const isActive = (command: string) => {
    try { return document.queryCommandState(command); } catch { return false; }
  };

  const commands: Cmd[] = [
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: Heading2, label: "Heading", run: () => exec("formatBlock", "<h2>") },
    { icon: List, label: "Bulleted list", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    { icon: Quote, label: "Quote", run: () => exec("formatBlock", "<blockquote>") },
    { icon: Code, label: "Code", run: () => wrapInlineCode() },
  ];

  const wrapInlineCode = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const code = document.createElement("code");
    code.appendChild(range.extractContents());
    range.insertNode(code);
    sel.removeAllRanges();
    const after = document.createRange();
    after.setStartAfter(code);
    after.collapse(true);
    sel.addRange(after);
    emit();
  };

  const activeStates = { bold: isActive("bold"), italic: isActive("italic") };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 p-1 border border-input rounded-md bg-muted/30">
        {commands.map((c) => {
          const active =
            (c.label === "Bold" && activeStates.bold) || (c.label === "Italic" && activeStates.italic);
          return (
            <Button
              key={c.label}
              type="button"
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={c.run}
              aria-label={c.label}
              aria-pressed={active}
              title={c.label}
            >
              <c.icon className="h-3.5 w-3.5" />
            </Button>
          );
        })}
        <span className="ml-auto text-[10px] text-muted-foreground self-center pr-2">Links are detected automatically</span>
      </div>

      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onKeyUp={() => forceTick((t) => t + 1)}
          onMouseUp={() => forceTick((t) => t + 1)}
          onBlur={emit}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
            if (files.length && onPasteFiles) { e.preventDefault(); onPasteFiles(files); return; }
            // Paste as plain text so foreign styles never leak in.
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          onDrop={(e) => {
            if (!onPasteFiles) return;
            const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
            if (files.length) { e.preventDefault(); onPasteFiles(files); }
          }}
          className={cn(
            "w-full rounded-md border border-input bg-background px-3 py-2 text-sm overflow-auto",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "[&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
            "[&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:font-mono",
          )}
          style={{ minHeight }}
        />
      </div>

      {maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
