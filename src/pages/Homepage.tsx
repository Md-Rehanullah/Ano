import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import CreatePostForm from "@/components/CreatePostForm";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import FirstTimeGuide from "@/components/FirstTimeGuide";
import PullToRefresh from "@/components/PullToRefresh";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserInteractions } from "@/hooks/useUserInteractions";
import { supabase } from "@/integrations/supabase/client";

import { saveFeedCache, loadFeedCache, isOnline } from "@/lib/offlineCache";
import OfflineBanner from "@/components/OfflineBanner";
import WeeklyLeaderboard from "@/components/WeeklyLeaderboard";
import type { CreatePostPayload } from "@/components/CreatePostForm";

interface Answer {
  id: string; content: string; likes: number; dislikes: number; replies: Answer[];
  created_at: string; parent_id?: string | null; authorName?: string; authorAvatar?: string;
  imageUrl?: string | null;
}
interface Post {
  id: string; title: string; description: string; category: string;
  likes: number; dislikes: number; views: number; answers: Answer[];
  created_at: string; edited_at?: string | null; is_pinned?: boolean;
  imageUrl?: string; videoUrl?: string;
  authorName?: string; authorAvatar?: string;
  authorUserId?: string | null; isSeed?: boolean;
}

const Homepage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const postIds = posts.map(p => p.id);
  const { interactions, setInteraction } = useUserInteractions(postIds);

  useEffect(() => { fetchPosts(); }, []);
  useEffect(() => { if (user) fetchBookmarks(); }, [user]);

  // Optimistically prepend posts created via the floating action button (no reload).
  useEffect(() => {
    const onNewPost = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data?.id) return;
      const newPost: Post = {
        id: data.id, title: data.title, description: data.description, category: data.category,
        likes: data.likes ?? 0, dislikes: data.dislikes ?? 0, views: 0,
        imageUrl: data.image_url, videoUrl: data.video_url, created_at: data.created_at,
        answers: [], authorUserId: data.user_id,
      };
      setPosts(prev => prev.some(p => p.id === newPost.id) ? prev : [newPost, ...prev]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("bridge:new-post", onNewPost as EventListener);
    return () => window.removeEventListener("bridge:new-post", onNewPost as EventListener);
  }, []);

  const fetchBookmarks = async () => {
    if (!user) return;
    const { data } = await supabase.from('bookmarks').select('post_id').eq('user_id', user.id);
    if (data) setBookmarkedIds(new Set(data.map(b => b.post_id)));
  };

  const SEEN_KEY = "bridge:seen-post-ids";
  const getSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } };
  const pushSeen = (ids: string[]) => {
    const merged = Array.from(new Set([...ids, ...getSeen()])).slice(0, 100);
    localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
  };

  const fetchPosts = async () => {
    if (!isOnline()) {
      const cached = loadFeedCache();
      if (cached) { setPosts(cached.posts as any); toast({ title: "Offline", description: "Showing cached posts." }); }
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const seen = getSeen();
      let { data, error } = await supabase.rpc('get_personalized_feed' as any, {
        p_user_id: authUser?.id ?? null,
        p_seen_ids: seen,
        p_limit: 40,
      });
      // If we exhausted unseen posts, reset and refetch
      if (!error && (!data || (data as any[]).length === 0) && seen.length > 0) {
        localStorage.removeItem(SEEN_KEY);
        const retry = await supabase.rpc('get_personalized_feed' as any, {
          p_user_id: authUser?.id ?? null, p_seen_ids: [], p_limit: 40,
        });
        data = retry.data; error = retry.error;
      }
      if (error || !data) {
        const cached = loadFeedCache();
        if (cached) { setPosts(cached.posts as any); toast({ title: "Showing cached posts", description: "Couldn't reach the server." }); }
        else toast({ title: "Error", description: "Failed to load posts.", variant: "destructive" });
        return;
      }
      const postsArr = data as any[];
      const postIdList = postsArr.map(p => p.id);
      const { data: answersData } = postIdList.length
        ? await supabase.from('answers').select('*').in('post_id', postIdList)
        : { data: [] as any[] };
      const answersByPost: Record<string, any[]> = {};
      (answersData || []).forEach((a: any) => { (answersByPost[a.post_id] ||= []).push(a); });

      const userIds = [...new Set([
        ...postsArr.map((p: any) => p.user_id),
        ...(answersData || []).map((a: any) => a.user_id),
      ].filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
        if (profiles) profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
      }

      for (const post of postsArr) {
        supabase.rpc('increment_post_views', { p_post_id: post.id }).then();
      }

      const mapped: Post[] = postsArr.map((post: any) => ({
        id: post.id, title: post.title, description: post.description, category: post.category,
        likes: post.likes, dislikes: post.dislikes, views: (post.views || 0) + 1,
        imageUrl: post.image_url, videoUrl: post.video_url, created_at: post.created_at,
        edited_at: post.edited_at, is_pinned: post.is_pinned,
        authorName: profilesMap[post.user_id]?.display_name || post.seed_author_name || null,
        authorAvatar: profilesMap[post.user_id]?.avatar_url || null,
        authorUserId: post.user_id, isSeed: post.is_seed,
        answers: (answersByPost[post.id] || []).map((a: any) => ({
          id: a.id, content: a.content, likes: a.likes, dislikes: a.dislikes, replies: [],
          created_at: a.created_at, parent_id: a.parent_id ?? null,
          authorName: profilesMap[a.user_id]?.display_name || a.seed_author_name || null,
          authorAvatar: profilesMap[a.user_id]?.avatar_url || null,
          imageUrl: a.image_url ?? null,
        }))
      }));
      setPosts(mapped);
      pushSeen(postIdList);
      saveFeedCache(mapped as any);
    } catch {
      const cached = loadFeedCache();
      if (cached) setPosts(cached.posts as any);
      else toast({ title: "Error", description: "Failed to load posts.", variant: "destructive" });
    }
    finally { setIsLoading(false); }
  };

  const handleCreatePost = async (newPostData: CreatePostPayload) => {
    if (!user) { navigate('/auth'); return; }
    try {
      const { data, error } = await supabase.from('posts').insert({
        user_id: user.id, title: newPostData.title || null, description: newPostData.description,
        category: newPostData.category, image_url: newPostData.imageUrl, video_url: newPostData.videoUrl
      }).select().single();
      if (error) throw error;

      // Optionally attach a poll
      if (newPostData.poll) {
        const { data: pollRow, error: pollErr } = await supabase
          .from('polls' as any)
          .insert({ post_id: data.id, question: newPostData.poll.question })
          .select('id')
          .single();
        if (!pollErr && pollRow) {
          const optionsPayload = newPostData.poll.options.map((label, i) => ({
            poll_id: (pollRow as any).id, label, position: i,
          }));
          await supabase.from('poll_options' as any).insert(optionsPayload);
        }
      }

      const newPost: Post = {
        id: data.id, title: data.title, description: data.description, category: data.category,
        likes: data.likes, dislikes: data.dislikes, views: 0, imageUrl: data.image_url,
        videoUrl: data.video_url, created_at: data.created_at, answers: []
      };
      setPosts(prev => [newPost, ...prev]);
    } catch { toast({ title: "Error", description: "Failed to create post.", variant: "destructive" }); }
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
    const { error } = await supabase.from('reports').insert({ user_id: user.id, post_id: postId, reason });
    if (error) { toast({ title: "Error", description: "Failed to submit report.", variant: "destructive" }); return; }
    toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
  };

  const handleAddAnswer = async (postId: string, content: string, parentId?: string | null, imageUrl?: string | null) => {
    if (!user) { navigate('/auth'); return; }
    if (!isOnline()) { toast({ title: "You're offline", description: "Reconnect to post a comment.", variant: "destructive" }); return; }
    try {
      const insertPayload: any = { post_id: postId, user_id: user.id, content };
      if (parentId) insertPayload.parent_id = parentId;
      if (imageUrl) insertPayload.image_url = imageUrl;
      await supabase.from('answers').insert(insertPayload).select().single();
      await fetchPosts();
      toast({ title: parentId ? "Reply posted!" : "Comment posted!" });
    } catch { toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" }); }
  };

  const handleAnswerLike = async (answerId: string) => {
    if (!user) { navigate('/auth'); return; }
    try { await supabase.rpc('increment_answer_likes', { answer_id: answerId, user_id: user.id }); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleBookmark = async (postId: string) => {
    if (!user) { navigate('/auth'); return; }
    if (bookmarkedIds.has(postId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
      setBookmarkedIds(prev => new Set(prev).add(postId));
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchPosts(), user ? fetchBookmarks() : Promise.resolve()]);
  }, [user]);

  return (
    <Layout>
      <OfflineBanner />
      <PullToRefresh onRefresh={handleRefresh} />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <CreatePostForm onCreatePost={handleCreatePost} />
        <WeeklyLeaderboard />
        <h2 className="text-lg font-semibold text-muted-foreground mb-4">Your Feed</h2>
        {isLoading ? (
          <div className="space-y-6">{[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No posts in the last 10 days. Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onLike={handleLike} onReport={handleReport}
                onAddAnswer={handleAddAnswer} onAnswerLike={handleAnswerLike} onBookmark={handleBookmark}
                userInteraction={interactions[post.id] || null} isBookmarked={bookmarkedIds.has(post.id)}
                canInteract={isOnline()} />
            ))}
          </div>
        )}
      </div>
      <FirstTimeGuide />
    </Layout>
  );
};

export default Homepage;
