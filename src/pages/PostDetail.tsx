import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserInteractions } from "@/hooks/useUserInteractions";
import { supabase } from "@/integrations/supabase/client";

interface Answer {
  id: string; content: string; likes: number; dislikes: number; replies: Answer[];
  created_at: string; parent_id?: string | null; authorName?: string; authorAvatar?: string;
}
interface Post {
  id: string; title: string; description: string; category: string;
  likes: number; dislikes: number; views: number; answers: Answer[];
  created_at: string; edited_at?: string | null; is_pinned?: boolean;
  imageUrl?: string; videoUrl?: string;
  authorName?: string; authorAvatar?: string;
  authorUserId?: string | null; isSeed?: boolean;
}

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const { interactions, setInteraction } = useUserInteractions(id ? [id] : []);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('posts').select('*, answers(*)').eq('id', id).maybeSingle();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    const userIds = [...new Set([data.user_id, ...(data.answers || []).map((a: any) => a.user_id)].filter(Boolean))];
    let pmap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
      pmap = Object.fromEntries((profs || []).map(p => [p.user_id, p]));
    }
    supabase.rpc('increment_post_views', { p_post_id: id }).then();
    setPost({
      id: data.id, title: data.title, description: data.description, category: data.category,
      likes: data.likes, dislikes: data.dislikes, views: (data.views || 0) + 1,
      imageUrl: data.image_url, videoUrl: data.video_url, created_at: data.created_at,
      edited_at: data.edited_at, is_pinned: data.is_pinned,
      authorName: pmap[data.user_id]?.display_name || data.seed_author_name || null,
      authorAvatar: pmap[data.user_id]?.avatar_url || null,
      authorUserId: data.user_id, isSeed: data.is_seed,
      answers: (data.answers || []).map((a: any) => ({
        id: a.id, content: a.content, likes: a.likes, dislikes: a.dislikes, replies: [],
        created_at: a.created_at, parent_id: a.parent_id ?? null,
        authorName: pmap[a.user_id]?.display_name || a.seed_author_name || null,
        authorAvatar: pmap[a.user_id]?.avatar_url || null,
      })),
    });
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPost(); }, [fetchPost]);
  useEffect(() => {
    if (!user || !id) return;
    supabase.from('bookmarks').select('post_id').eq('user_id', user.id).eq('post_id', id).maybeSingle()
      .then(({ data }) => setIsBookmarked(!!data));
  }, [user, id]);

  const handleLike = async (postId: string) => {
    if (!user) { navigate('/auth'); return; }
    const ci = interactions[postId]; if (ci === 'like') return;
    setInteraction(postId, 'like');
    setPost(p => p ? { ...p, likes: p.likes + 1 } : p);
    try { await supabase.rpc('increment_post_likes' as any, { post_id: postId, user_id: user.id }); }
    catch { setInteraction(postId, ci); setPost(p => p ? { ...p, likes: p.likes - 1 } : p); }
  };
  const handleReport = async (postId: string, reason: string) => {
    if (!user) { navigate('/auth'); return; }
    const { error } = await supabase.from('reports').insert({ user_id: user.id, post_id: postId, reason });
    if (error) toast({ title: "Error", variant: "destructive" });
    else toast({ title: "Report submitted" });
  };
  const handleAddAnswer = async (postId: string, content: string, parentId?: string | null) => {
    if (!user) { navigate('/auth'); return; }
    const payload: any = { post_id: postId, user_id: user.id, content };
    if (parentId) payload.parent_id = parentId;
    await supabase.from('answers').insert(payload);
    await fetchPost();
    toast({ title: parentId ? "Reply posted!" : "Comment posted!" });
  };
  const handleAnswerLike = async (answerId: string) => {
    if (!user) { navigate('/auth'); return; }
    await supabase.rpc('increment_answer_likes', { answer_id: answerId, user_id: user.id });
  };
  const handleBookmark = async (postId: string) => {
    if (!user) { navigate('/auth'); return; }
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
      setIsBookmarked(true);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {loading ? (
          <PostCardSkeleton />
        ) : notFound || !post ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>This post is no longer available.</p>
          </div>
        ) : (
          <PostCard post={post} onLike={handleLike} onReport={handleReport}
            onAddAnswer={handleAddAnswer} onAnswerLike={handleAnswerLike} onBookmark={handleBookmark}
            userInteraction={interactions[post.id] || null} isBookmarked={isBookmarked} canInteract />
        )}
      </div>
    </Layout>
  );
};

export default PostDetail;
