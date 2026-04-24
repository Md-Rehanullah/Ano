import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Code, Link as LinkIcon, Quote, Heading2 } from "lucide-react";

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}

type Action = { icon: any; label: string; wrap?: [string, string]; line?: string };

const actions: Action[] = [
  { icon: Bold, label: "Bold", wrap: ["**", "**"] },
  { icon: Italic, label: "Italic", wrap: ["*", "*"] },
  { icon: Heading2, label: "Heading", line: "## " },
  { icon: List, label: "Bulleted list", line: "- " },
  { icon: ListOrdered, label: "Numbered list", line: "1. " },
  { icon: Quote, label: "Quote", line: "> " },
  { icon: Code, label: "Code", wrap: ["`", "`"] },
  { icon: LinkIcon, label: "Link", wrap: ["[", "](url)"] },
];

const MarkdownToolbar = ({ textareaRef, value, onChange }: Props) => {
  const apply = (a: Action) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const selected = value.slice(start, end);

    let next: string;
    let cursorPos: number;

    if (a.wrap) {
      const [open, close] = a.wrap;
      next = value.slice(0, start) + open + (selected || "text") + close + value.slice(end);
      cursorPos = start + open.length + (selected ? selected.length : 4);
    } else if (a.line) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      next = value.slice(0, lineStart) + a.line + value.slice(lineStart);
      cursorPos = end + a.line.length;
    } else {
      return;
    }

    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  };

  return (
    <div className="flex flex-wrap gap-1 p-1 border border-input rounded-md bg-muted/30">
      {actions.map((a) => (
        <Button
          key={a.label}
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => apply(a)}
          aria-label={a.label}
          title={a.label}
        >
          <a.icon className="h-3.5 w-3.5" />
        </Button>
      ))}
      <span className="ml-auto text-[10px] text-muted-foreground self-center pr-2">Markdown supported</span>
    </div>
  );
};

export default MarkdownToolbar;
