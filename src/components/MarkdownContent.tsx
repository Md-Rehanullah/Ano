import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props {
  children: string;
  className?: string;
}

/**
 * Renders user-provided markdown safely. react-markdown escapes raw HTML by
 * default, so this is XSS-safe. Supports GFM (tables, strikethrough, task lists).
 * Styles are scoped via prose-like utility classes using design tokens.
 */
const MarkdownContent = ({ children, className }: Props) => {
  return (
    <div
      className={cn(
        "text-sm sm:text-base text-foreground/90 leading-relaxed break-words",
        "[&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-wrap",
        "[&_strong]:font-semibold [&_em]:italic",
        "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-2",
        "[&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2",
        "[&_li]:mb-0.5",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80",
        "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:font-mono",
        "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-2",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_hr]:my-3 [&_hr]:border-border",
        "[&_table]:w-full [&_table]:my-2 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
