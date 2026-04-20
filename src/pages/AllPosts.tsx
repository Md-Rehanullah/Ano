import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserInteractions } from "@/hooks/useUserInteractions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const CATEGORIES = ["General", "Technology", "Education", "Lifestyle", "Other"];

interface Answer {
  id: string; content: string; likes: number; dislikes: number; replies: Answer[];
  created_at: string; authorName?: string; authorAvatar?: string;
}
interface Post {
  id: string; title: string; description: string; category: string;
  likes: number; dislikes: number; views: number; answers: Answer[];
  created_at: string; imageUrl?: string; videoUrl?: string;
  authorName?: string; authorAvatar?: string;
  authorUserId?: string | null; isSeed?: boolean;
}

const AllPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const postIds = posts.map(p => p.id);
  const { interactions, setInteraction } = useUserInteractions(postIds);

  useEffect(() => { fetchPosts(); }, []);
  useEffect(() => { if (user) fetchBookmarks(); }, [user]);

  useEffect(() => {
    let result = posts;
    if (searchQuery.trim()) result = result.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedCategory) result = result.filter(p => p.category === selectedCategory);
    setFilteredPosts(result);
  }, [searchQuery, posts, selectedCategory]);

  const fetchBookmarks = async () => {
    if (!user) return;
    const { data } = await supabase.from('bookmarks').select('post_id').eq('user_id', user.id);
    if (data) setBookmarkedIds(new Set(data.map(b => b.post_id)));
  };

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('posts').select('*, answers(*)').order('created_at', { ascending: false });
      if (error) { toast({ title: "Error", description: "Failed to load posts.", variant: "destructive" }); return; }

      const userIds = [...new Set([...data.map((p: any) => p.user_id), ...data.flatMap((p: any) => p.answers.map((a: any) => a.user_id))].filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
        if (profiles) profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
      }

      const transformed: Post[] = data.map((post: any) => ({
        id: post.id, title: post.title, description: post.description, category: post.category,
        likes: post.likes, dislikes: post.dislikes, views: post.views || 0,
        imageUrl: post.image_url, videoUrl: post.video_url, created_at: post.created_at,
        authorName: profilesMap[post.user_id]?.display_name || post.seed_author_name || null,
        authorAvatar: profilesMap[post.user_id]?.avatar_url || null,
        authorUserId: post.user_id, isSeed: post.is_seed,
        answers: post.answers.map((a: any) => ({
          id: a.id, content: a.content, likes: a.likes, dislikes: a.dislikes, replies: [], created_at: a.created_at,
          authorName: profilesMap[a.user_id]?.display_name || null,
          authorAvatar: profilesMap[a.user_id]?.avatar_url || null,
        }))
      }));
      setPosts(transformed);
      setFilteredPosts(transformed);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleLike = async (postId: string) => {
    if (!user) { navigate('/auth'); return; }
    const ci = interactions[postId]; if (ci === 'like') return;
    setInteraction(postId, 'like');
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    try { const { error } = await supabase.rpc('increment_post_likes' as any, { post_id: postId, user_id: user.id }); if (error) throw error; }
    catch { setInteraction(postId, ci); setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes - 1 } : p)); }
  };

  const handleReport = async (postId: string, reason: string) => {
    if (!user) { navigate('/auth'); return; }
    await supabase.from('reports').insert({ user_id: user.id, post_id: postId, reason });
    toast({ title: "Report submitted" });
  };

  const handleAddAnswer = async (postId: string, content: string) => {
    if (!user) { navigate('/auth'); return; }
    try {
      await supabase.from('answers').insert({ post_id: postId, user_id: user.id, content }).select().single();
      await fetchPosts();
      toast({ title: "Comment posted!" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleAnswerLike = async (answerId: string) => {
    if (!user) { navigate('/auth'); return; }
    try { await supabase.rpc('increment_answer_likes', { answer_id: answerId, user_id: user.id }); } catch {}
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

  const handleCreatePost = async (newPostData: { title: string; description: string; category: string; imageUrl?: string }) => {
    if (!user) { navigate('/auth'); return; }
    try {
      await supabase.from('posts').insert({ user_id: user.id, title: newPostData.title, description: newPostData.description, category: newPostData.category, image_url: newPostData.imageUrl });
      await fetchPosts();
      toast({ title: "Post created!" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  // Tab sorting: All = latest, Trending = most viewed+commented, Most Liked = by likes
  const allPosts = filteredPosts;
  const trendingPosts = [...filteredPosts].sort((a, b) => (b.views + b.answers.length) - (a.views + a.answers.length));
  const mostLikedPosts = [...filteredPosts].sort((a, b) => b.likes - a.likes);

  const renderPosts = (postsList: Post[]) => (
    <div className="space-y-6">
      {isLoading ? [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />) :
        postsList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">{searchQuery || selectedCategory ? "No posts found matching your filters." : "No posts yet."}</p>
          </div>
        ) : postsList.map(post => (
          <PostCard key={post.id} post={post} onLike={handleLike} onReport={handleReport}
            onAddAnswer={handleAddAnswer} onAnswerLike={handleAnswerLike} onBookmark={handleBookmark}
            userInteraction={interactions[post.id] || null} isBookmarked={bookmarkedIds.has(post.id)} />
        ))}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">All Posts</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" placeholder="Search posts by title..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0"><Filter className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedCategory(null)} className={!selectedCategory ? "font-semibold" : ""}>All Categories</DropdownMenuItem>
                {CATEGORIES.map(cat => (
                  <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)} className={selectedCategory === cat ? "font-semibold" : ""}>{cat}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {selectedCategory && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtered by:</span>
              <Button variant="secondary" size="sm" onClick={() => setSelectedCategory(null)} className="h-7 text-xs">{selectedCategory} ✕</Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="most-liked">Most Liked</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderPosts(allPosts)}</TabsContent>
          <TabsContent value="trending">{renderPosts(trendingPosts)}</TabsContent>
          <TabsContent value="most-liked">{renderPosts(mostLikedPosts)}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AllPosts;
