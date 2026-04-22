import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, Share2, Flag, MessageCircle, Eye, Bookmark, BookmarkCheck, Pin, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import UserAvatar from "@/components/UserAvatar";
import MediaLightbox from "@/components/MediaLightbox";
import VideoPlayer from "@/components/VideoPlayer";
import CommentThread, { buildCommentTree, Comment } from "@/components/CommentThread";

interface Answer {
  id: string;
  content: string;
  likes: number;
  dislikes: number;
  replies: Answer[];
  created_at: string;
  parent_id?: string | null;
  authorName?: string;
  authorAvatar?: string;
}

interface Post {
  id: string;
  title: string;
  description: string;
  category: string;
  likes: number;
  dislikes: number;
  views: number;
  answers: Answer[];
  created_at: string;
  edited_at?: string | null;
  is_pinned?: boolean;
  imageUrl?: string;
  videoUrl?: string;
  authorName?: string;
  authorAvatar?: string;
  authorUserId?: string | null;
  isSeed?: boolean;
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onReport: (postId: string, reason: string) => void;
  onAddAnswer: (postId: string, answer: string, parentId?: string | null) => void;
  onAnswerLike?: (answerId: string) => void;
  onBookmark?: (postId: string) => void;
  userInteraction?: 'like' | 'dislike' | null;
  isBookmarked?: boolean;
  /** True when the user can react/comment (online + signed-in flow handled by parent). */
  canInteract?: boolean;
}

// ~350 words ≈ 2300 chars
const READ_MORE_THRESHOLD = 2300;

const PostCard = ({ post, onLike, onReport, onAddAnswer, onAnswerLike, onBookmark, userInteraction, isBookmarked, canInteract = true }: PostCardProps) => {
  const [newAnswer, setNewAnswer] = useState("");
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isLong = post.description.length > READ_MORE_THRESHOLD;
  const visibleDescription = !expanded && isLong
    ? post.description.slice(0, READ_MORE_THRESHOLD).trimEnd() + "…"
    : post.description;

  // Build a tree from the flat answers list (parent_id-aware nested replies)
  const flatComments: Comment[] = post.answers.map(a => ({
    id: a.id,
    content: a.content,
    likes: a.likes,
    dislikes: a.dislikes,
    created_at: a.created_at,
    parent_id: a.parent_id ?? null,
    authorName: a.authorName,
    authorAvatar: a.authorAvatar,
  }));
  const commentTree = buildCommentTree(flatComments);

  const openAuthorProfile = () => {
    if (post.isSeed) {
      navigate(`/u/private`);
      return;
    }
    if (post.authorUserId) navigate(`/u/${post.authorUserId}`);
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: post.title, text: post.description, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!", description: "The post link has been copied to your clipboard." });
    }
  };

  const handleReport = () => {
    if (reportReason.trim()) {
      onReport(post.id, reportReason);
      setReportReason("");
      setShowReportForm(false);
    }
  };

  const handleAddAnswer = () => {
    if (newAnswer.trim()) {
      onAddAnswer(post.id, newAnswer);
      setNewAnswer("");
      setShowAnswerForm(false);
    }
  };

  const mediaType: "image" | "video" | null = post.videoUrl ? "video" : post.imageUrl ? "image" : null;
  const mediaSrc = post.videoUrl || post.imageUrl || "";

  return (
    <Card className="p-4 sm:p-6 shadow-card hover:shadow-elegant transition-all duration-300">
      <div className="space-y-3">
        {/* Post Header — author area is clickable */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={openAuthorProfile}
            className="flex items-start gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
          >
            <UserAvatar src={post.authorAvatar} name={post.authorName} className="h-9 w-9 flex-shrink-0 mt-0.5" fallbackClassName="text-xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-sm font-medium text-foreground hover:text-primary transition-colors">{post.authorName || "Anonymous"}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold">{post.title}</h3>
            </div>
          </button>
          <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">{post.category}</Badge>
        </div>

        {/* Content Box */}
        <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
          <p className="text-sm sm:text-base text-foreground/90 whitespace-pre-wrap">{visibleDescription}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs sm:text-sm font-medium text-primary hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        {/* Media */}
        {post.imageUrl && !post.videoUrl && (
          <div className="rounded-lg overflow-hidden cursor-pointer" onClick={() => setLightboxOpen(true)}>
            <img src={post.imageUrl} alt="Post content" className="w-full max-h-80 object-cover hover:opacity-90 transition-opacity" />
          </div>
        )}
        {post.videoUrl && (
          <VideoPlayer src={post.videoUrl} onClick={() => setLightboxOpen(true)} />
        )}

        {/* Lightbox with download/share/report */}
        {mediaType && (
          <MediaLightbox
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
            src={mediaSrc}
            type={mediaType}
            postId={post.id}
            onReport={(reason) => onReport(post.id, `[media] ${reason}`)}
          />
        )}

        {/* Action Buttons - single row */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => onLike(post.id)}
              className={`h-8 px-2 text-xs gap-1 ${userInteraction === 'like' ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}>
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{post.likes}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAnswerForm(!showAnswerForm)}
              className="h-8 px-2 text-xs gap-1 text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{post.answers.length}</span>
            </Button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground px-2">
              <Eye className="h-3.5 w-3.5" />
              <span>{post.views}</span>
            </span>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => onBookmark?.(post.id)}
              className={`h-8 px-2 text-xs ${isBookmarked ? 'text-primary' : 'text-muted-foreground'}`}>
              {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare}
              className="h-8 px-2 text-xs text-muted-foreground">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowReportForm(!showReportForm)}
              className="h-8 px-2 text-xs text-muted-foreground">
              <Flag className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Report Form */}
        {showReportForm && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Textarea placeholder="Please explain why you're reporting this post..." value={reportReason}
              onChange={(e) => setReportReason(e.target.value)} className="resize-none w-full min-h-20" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReport}>Submit Report</Button>
              <Button size="sm" variant="outline" onClick={() => setShowReportForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Comment Form */}
        {showAnswerForm && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Textarea placeholder="Write your comment..." value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)} className="resize-none w-full min-h-20" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAnswer}>Post Comment</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAnswerForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Comments Section */}
        {post.answers.length > 0 && (
          <div className="space-y-3 border-t pt-3">
            <h4 className="font-medium text-sm">
              {post.answers.length} {post.answers.length === 1 ? 'Comment' : 'Comments'}
            </h4>
            {displayedAnswers.map((answer) => (
              <div key={answer.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar src={answer.authorAvatar} name={answer.authorName} className="h-6 w-6" fallbackClassName="text-[10px]" />
                  <span className="text-xs font-medium">{answer.authorName || "Anonymous"}</span>
                </div>
                <p className="text-sm mb-2">{answer.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button className="flex items-center space-x-1 hover:text-primary transition-colors cursor-pointer"
                    onClick={() => onAnswerLike?.(answer.id)}>
                    <ThumbsUp className="h-3 w-3" /><span>{answer.likes}</span>
                  </button>
                  <span>{formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
            {hasMoreAnswers && (
              <Button variant="ghost" size="sm" onClick={() => setShowAllAnswers(!showAllAnswers)}
                className="flex items-center space-x-1 text-muted-foreground">
                {showAllAnswers ? <><ChevronUp className="h-4 w-4" /><span>Show Less</span></> :
                  <><ChevronDown className="h-4 w-4" /><span>Show All {post.answers.length} Comments</span></>}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default PostCard;
