import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserInteractions } from "@/hooks/useUserInteractions";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark } from "lucide-react";

interface Answer {
  id: string; content: string; likes: number; dislikes: number; replies: Answer[];
  created_at: string; authorName?: string; authorAvatar?: string;
}
interface Post {
  id: string; title: string; description: string; category: string;
  likes: number; dislikes: number; views: number; answers: Answer[];
  created_at: string; imageUrl?: string; videoUrl?: string;
  authorName?: string; authorAvatar?: string;
}

const Bookmarks = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const postIds = posts.map(p => p.id);
  const { interactions, setInteraction } = useUserInteractions(postIds);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading]);
  useEffect(() => { if (user) fetchBookmarks(); }, [user]);

  const fetchBookmarks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: bm } = await supabase.from('bookmarks').select('post_id').eq('user_id', user.id);
      if (!bm || bm.length === 0) { setPosts([]); setBookmarkedIds(new Set()); return; }
      const ids = bm.map(b => b.post_id);
      setBookmarkedIds(new Set(ids));

      const { data, error } = await supabase.from('posts').select('*, answers(*)').in('id', ids).order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set([...data.map((p: any) => p.user_id), ...data.flatMap((p: any) => p.answers.map((a: any) => a.user_id))].filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
        if (profiles) profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
      }

      setPosts(data.map((post: any) => ({
        id: post.id, title: post.title, description: post.description, category: post.category,
        likes: post.likes, dislikes: post.dislikes, views: post.views || 0,
        imageUrl: post.image_url, videoUrl: post.video_url, created_at: post.created_at,
        authorName: profilesMap[post.user_id]?.display_name || post.seed_author_name || null,
        authorAvatar: profilesMap[post.user_id]?.avatar_url || null,
        answers: post.answers.map((a: any) => ({
          id: a.id, content: a.content, likes: a.likes, dislikes: a.dislikes, replies: [], created_at: a.created_at,
          authorName: profilesMap[a.user_id]?.display_name || null,
          authorAvatar: profilesMap[a.user_id]?.avatar_url || null,
        }))
      })));
    } catch { toast({ title: "Error", description: "Failed to load bookmarks.", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleBookmark = async (postId: string) => {
    if (!user) { navigate('/auth'); return; }
    if (bookmarkedIds.has(postId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
      setBookmarkedIds(prev => new Set(prev).add(postId));
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) { navigate('/auth'); return; }
    const ci = interactions[postId]; if (ci === 'like') return;
    setInteraction(postId, 'like');
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    try {
      const { error } = await supabase.rpc('increment_post_likes' as any, { post_id: postId, user_id: user.id });
      if (error) throw error;
    } catch { setInteraction(postId, ci); setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes - 1 } : p)); }
  };

  const handleReport = async (postId: string, reason: string) => {
    if (!user) { navigate('/auth'); return; }
    await supabase.from('reports').insert({ user_id: user.id, post_id: postId, reason });
    toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
  };

  const handleAddAnswer = async (postId: string, content: string) => {
    if (!user) { navigate('/auth'); return; }
    try {
      await supabase.from('answers').insert({ post_id: postId, user_id: user.id, content }).select().single();
      await fetchBookmarks();
      toast({ title: "Comment posted!" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleAnswerLike = async (answerId: string) => {
    if (!user) { navigate('/auth'); return; }
    try { await supabase.rpc('increment_answer_likes', { answer_id: answerId, user_id: user.id }); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-primary" /> Saved Posts
        </h1>
        {isLoading ? (
          <div className="space-y-6">{[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No saved posts yet. Bookmark posts to find them here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onLike={handleLike} onReport={handleReport}
                onAddAnswer={handleAddAnswer} onAnswerLike={handleAnswerLike} onBookmark={handleBookmark}
                userInteraction={interactions[post.id] || null} isBookmarked={bookmarkedIds.has(post.id)} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Bookmarks;
