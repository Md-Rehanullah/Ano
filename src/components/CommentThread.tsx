import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageCircle, ChevronDown, ChevronUp, Loader2, ImagePlus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import UserAvatar from "@/components/UserAvatar";
import MarkdownContent from "@/components/MarkdownContent";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { checkProfanity } from "@/lib/profanity";
import { supabase } from "@/integrations/supabase/client";

export interface Comment {
  id: string;
  content: string;
  likes: number;
  dislikes: number;
  created_at: string;
  parent_id?: string | null;
  authorName?: string | null;
  authorAvatar?: string | null;
  imageUrl?: string | null;
  replies?: Comment[];
}

interface Props {
  comment: Comment;
  postId: string;
  depth?: number;
  onLike?: (commentId: string) => void;
  onReply: (postId: string, content: string, parentId: string, imageUrl?: string | null) => Promise<void> | void;
  /** Are unauthenticated actions allowed (will redirect on click)? */
  canInteract: boolean;
}

const MAX_INDENT = 5;

const CommentNode = ({ comment, postId, depth = 0, onLike, onReply, canInteract }: Props) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Max 5MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const filePath = `comments/${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      setImage(publicUrl);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!text.trim() && !image) return;
    const profanityCheck = checkProfanity(text);
    if (!profanityCheck.ok) {
      toast({
        title: "Inappropriate language",
        description: `Please remove profane or adult content (matched: "${profanityCheck.match}").`,
        variant: "destructive",
      });
      return;
    }
    setPosting(true);
    try {
      await onReply(postId, text.trim(), comment.id, image || null);
      setText("");
      setImage("");
      setOpen(false);
    } finally {
      setPosting(false);
    }
  };

  const replies = comment.replies || [];
  const indent = Math.min(depth, MAX_INDENT);

  return (
    <div
      className={cn("relative", depth > 0 && "mt-2")}
      style={{ marginLeft: indent > 0 ? `${Math.min(indent * 12, 48)}px` : undefined }}
    >
      {depth > 0 && (
        <span aria-hidden className="absolute -left-3 top-0 bottom-0 w-px bg-border" />
      )}

      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              src={comment.authorAvatar || undefined}
              name={comment.authorName || undefined}
              className="h-6 w-6"
              fallbackClassName="text-[10px]"
            />
            <span className="text-xs font-medium truncate">{comment.authorName || "Anonymous"}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          {replies.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies(s => !s)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              aria-label={showReplies ? "Hide replies" : "Show replies"}
            >
              {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showReplies ? `Hide ${replies.length}` : `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
        </div>

        <div className="mb-2"><MarkdownContent className="text-sm">{comment.content}</MarkdownContent></div>
        {comment.imageUrl && (
          <img src={comment.imageUrl} alt="comment attachment" loading="lazy" className="mb-2 max-h-72 rounded-md w-auto" />
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => onLike?.(comment.id)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-primary transition-colors"
          >
            <ThumbsUp className="h-3 w-3" />
            <span>{comment.likes}</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-primary transition-colors"
          >
            <MessageCircle className="h-3 w-3" />
            <span>Reply</span>
          </button>
        </div>

        {open && (
          <div className="mt-2 space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={canInteract ? "Write a reply..." : "Sign in to reply"}
              className="resize-none min-h-16 text-sm"
              maxLength={2000}
              disabled={!canInteract}
            />
            <div className="flex items-center gap-2">
              <input id={`reply-img-${comment.id}`} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
              <Button
                type="button" variant="outline" size="sm" disabled={uploading || !canInteract}
                onClick={() => document.getElementById(`reply-img-${comment.id}`)?.click()}
                className="h-7 text-xs"
              >
                <ImagePlus className="h-3 w-3 mr-1" />
                {uploading ? "Uploading…" : (image ? "Replace" : "Add image")}
              </Button>
              {image && (
                <button type="button" onClick={() => setImage("")} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="h-3 w-3" /> remove
                </button>
              )}
            </div>
            {image && <img src={image} alt="reply attachment" className="max-h-32 rounded-md" />}
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={posting || (!text.trim() && !image) || !canInteract}>
                {posting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Posting...</> : "Post Reply"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setOpen(false); setText(""); setImage(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {showReplies && replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              postId={postId}
              depth={depth + 1}
              onLike={onLike}
              onReply={onReply}
              canInteract={canInteract}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowReplies(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-1"
          >
            <ChevronUp className="h-3 w-3" />
            Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
        </div>
      )}
    </div>
  );
};

interface ThreadProps {
  comments: Comment[];
  postId: string;
  onLike?: (commentId: string) => void;
  onReply: (postId: string, content: string, parentId: string, imageUrl?: string | null) => Promise<void> | void;
  canInteract: boolean;
}

export const buildCommentTree = (flat: Comment[]): Comment[] => {
  const byId = new Map<string, Comment>();
  flat.forEach(c => byId.set(c.id, { ...c, replies: [] }));
  const roots: Comment[] = [];
  byId.forEach(c => {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  });
  const sortRec = (arr: Comment[]) => {
    arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    arr.forEach(c => c.replies && sortRec(c.replies));
  };
  sortRec(roots);
  return roots;
};

const CommentThread = ({ comments, postId, onLike, onReply, canInteract }: ThreadProps) => {
  return (
    <div className="space-y-2">
      {comments.map(c => (
        <CommentNode
          key={c.id}
          comment={c}
          postId={postId}
          depth={0}
          onLike={onLike}
          onReply={onReply}
          canInteract={canInteract}
        />
      ))}
    </div>
  );
};

export default CommentThread;
