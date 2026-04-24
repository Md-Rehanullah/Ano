import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownToolbar from "@/components/MarkdownToolbar";
import MarkdownContent from "@/components/MarkdownContent";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxLength?: number;
  id?: string;
}

const RichTextEditor = ({ value, onChange, placeholder, minHeight = "120px", maxLength, id }: Props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="space-y-2">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="h-8">
          <TabsTrigger value="write" className="text-xs h-6">Write</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs h-6">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="mt-2 space-y-2">
          <MarkdownToolbar textareaRef={ref} value={value} onChange={onChange} />
          <Textarea
            id={id}
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="resize-y font-mono text-sm"
            style={{ minHeight }}
            maxLength={maxLength}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-2">
          <div
            className="rounded-md border border-input bg-background p-3 overflow-auto"
            style={{ minHeight }}
          >
            {value.trim() ? (
              <MarkdownContent>{value}</MarkdownContent>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
