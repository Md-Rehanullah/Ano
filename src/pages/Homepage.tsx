import { useState, useEffect, useCallback, useRef } from "react";
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
import { getFeedSeed, rotateFeedSeed, FEED_PAGE_SIZE } from "@/lib/feedSession";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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

  // Ranking seed: pinned for the whole browsing session so the order stays stable,
  // rotated only on an explicit refresh / new app session.
  const seedRef = useRef<string>(getFeedSeed());
  const offsetRef = useRef(0);

  const hydratePosts = async (postsArr: any[]): Promise<Post[]> => {
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

    return postsArr.map((post: any) => ({
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
  };

  const fetchPage = async (offset: number) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('get_personalized_feed' as any, {
      p_user_id: authUser?.id ?? null,
      p_seed: seedRef.current,
      p_limit: FEED_PAGE_SIZE,
      p_offset: offset,
    });
    if (error) throw error;
    const rows = (data as any[]) || [];
    const mapped = await hydratePosts(rows);
    // Remember what we showed so the ranker can rotate content next session.
    if (authUser && rows.length) {
      supabase.rpc('record_feed_impressions' as any, { p_post_ids: rows.map(r => r.id) }).then();
    }
    return mapped;
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
      const mapped = await fetchPage(0);
      offsetRef.current = mapped.length;
      setHasMore(mapped.length === FEED_PAGE_SIZE);
      setPosts(mapped);
      saveFeedCache(mapped as any);
    } catch {
      const cached = loadFeedCache();
      if (cached) { setPosts(cached.posts as any); toast({ title: "Showing cached posts", description: "Couldn't reach the server." }); }
      else toast({ title: "Error", description: "Failed to load posts.", variant: "destructive" });
    }
    finally { setIsLoading(false); }
  };

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !isOnline()) return;
    setIsLoadingMore(true);
    try {
      const mapped = await fetchPage(offsetRef.current);
      offsetRef.current += mapped.length;
      setPosts(prev => {
        const existing = new Set(prev.map(p => p.id));
        return [...prev, ...mapped.filter(p => !existing.has(p.id))];
      });
      setHasMore(mapped.length === FEED_PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally { setIsLoadingMore(false); }
  }, [isLoadingMore, hasMore]);


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
      const { error } = await supabase.rpc('increment_post_likes' as any, { post_id: postId });
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
    try { await supabase.rpc('increment_answer_likes' as any, { answer_id: answerId }); }
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
    // New feed session -> new ranking variation from the same post pool.
    seedRef.current = rotateFeedSeed();
    offsetRef.current = 0;
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
            <p className="text-lg">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onLike={handleLike} onReport={handleReport}
                onAddAnswer={handleAddAnswer} onAnswerLike={handleAnswerLike} onBookmark={handleBookmark}
                userInteraction={interactions[post.id] || null} isBookmarked={bookmarkedIds.has(post.id)}
                canInteract={isOnline()} />
            ))}
            <div className="flex justify-center pt-2">
              {hasMore ? (
                <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? "Loading..." : "Load more posts"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">You're all caught up.</p>
              )}
            </div>
          </div>
        )}
      </div>
      <FirstTimeGuide />
    </Layout>
  );
};


export default Homepage;
