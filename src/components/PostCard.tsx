import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ThumbsUp, Share2, Flag, MessageCircle, ChevronDown, ChevronUp, User, Eye, Bookmark, BookmarkCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Answer {
  id: string;
  content: string;
  likes: number;
  dislikes: number;
  replies: Answer[];
  created_at: string;
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
  imageUrl?: string;
  videoUrl?: string;
  authorName?: string;
  authorAvatar?: string;
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onReport: (postId: string, reason: string) => void;
  onAddAnswer: (postId: string, answer: string) => void;
  onAnswerLike?: (answerId: string) => void;
  onBookmark?: (postId: string) => void;
  userInteraction?: 'like' | 'dislike' | null;
  isBookmarked?: boolean;
}

const PostCard = ({ post, onLike, onReport, onAddAnswer, onAnswerLike, onBookmark, userInteraction, isBookmarked }: PostCardProps) => {
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [newAnswer, setNewAnswer] = useState("");
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { toast } = useToast();

  const displayedAnswers = showAllAnswers ? post.answers : post.answers.slice(0, 4);
  const hasMoreAnswers = post.answers.length > 4;

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

  return (
    <Card className="p-4 sm:p-6 shadow-card hover:shadow-elegant transition-all duration-300">
      <div className="space-y-3">
        {/* Post Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
            <AvatarImage src={post.authorAvatar || undefined} alt={post.authorName || "Anonymous"} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="text-sm font-medium text-foreground">{post.authorName || "Anonymous"}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">{post.category}</Badge>
            </div>
            <h3 className="text-base sm:text-lg font-semibold">{post.title}</h3>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
          <p className="text-sm sm:text-base text-foreground/90 whitespace-pre-wrap">{post.description}</p>
        </div>

        {/* Media */}
        {post.imageUrl && (
          <>
            <div className="rounded-lg overflow-hidden cursor-pointer" onClick={() => setLightboxOpen(true)}>
              <img src={post.imageUrl} alt="Post content" className="w-full h-48 object-cover hover:opacity-90 transition-opacity" />
            </div>
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/90 border-none">
                <img src={post.imageUrl} alt="Post content full" className="w-full h-full object-contain max-h-[85vh]" />
              </DialogContent>
            </Dialog>
          </>
        )}
        {post.videoUrl && (
          <div className="rounded-lg overflow-hidden">
            <video src={post.videoUrl} controls className="w-full max-h-80 rounded-lg" />
          </div>
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
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={answer.authorAvatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]"><User className="h-3 w-3" /></AvatarFallback>
                  </Avatar>
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
