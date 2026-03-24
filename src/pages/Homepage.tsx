import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import CreatePostForm from "@/components/CreatePostForm";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import FloatingCreatePostButton from "@/components/FloatingCreatePostButton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserInteractions } from "@/hooks/useUserInteractions";
import { supabase } from "@/integrations/supabase/client";

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
  answers: Answer[];
  created_at: string;
  imageUrl?: string;
  authorName?: string;
  authorAvatar?: string;
}

const Homepage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const postIds = posts.map(post => post.id);
  const { interactions, setInteraction } = useUserInteractions(postIds);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      // Fetch posts from the last 10 days only
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const { data, error } = await supabase
        .from('posts')
        .select(`*, answers (*)`)
        .gte('created_at', tenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        toast({ title: "Error", description: "Failed to load posts.", variant: "destructive" });
        return;
      }

      const postUserIds = data.map((p: any) => p.user_id).filter(Boolean);
      const answerUserIds = data.flatMap((p: any) => p.answers.map((a: any) => a.user_id)).filter(Boolean);
      const allUserIds = [...new Set([...postUserIds, ...answerUserIds])];

      let profilesMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', allUserIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
        }
      }

      const transformedPosts: Post[] = data.map((post: any) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        category: post.category,
        likes: post.likes,
        dislikes: post.dislikes,
        imageUrl: post.image_url,
        created_at: post.created_at,
        authorName: profilesMap[post.user_id]?.display_name || null,
        authorAvatar: profilesMap[post.user_id]?.avatar_url || null,
        answers: post.answers.map((answer: any) => ({
          id: answer.id,
          content: answer.content,
          likes: answer.likes,
          dislikes: answer.dislikes,
          replies: [],
          created_at: answer.created_at,
          authorName: profilesMap[answer.user_id]?.display_name || null,
          authorAvatar: profilesMap[answer.user_id]?.avatar_url || null,
        }))
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({ title: "Error", description: "Failed to load posts.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (newPostData: {
    title: string;
    description: string;
    category: string;
    imageUrl?: string;
  }) => {
    if (!user) { navigate('/auth'); return; }
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title: newPostData.title,
          description: newPostData.description,
          category: newPostData.category,
          image_url: newPostData.imageUrl
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
        return;
      }

      const newPost: Post = {
        id: data.id, title: data.title, description: data.description,
        category: data.category, likes: data.likes, dislikes: data.dislikes,
        imageUrl: data.image_url, created_at: data.created_at, answers: []
      };
      setPosts(prevPosts => [newPost, ...prevPosts]);
    } catch {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
    }
  };

  const updatePostLocally = (postId: string, updater: (post: Post) => Post) => {
    setPosts(prev => prev.map(p => p.id === postId ? updater(p) : p));
  };
  const updateAnswerLocally = (answerId: string, updater: (answer: Answer) => Answer) => {
    setPosts(prev => prev.map(p => ({ ...p, answers: p.answers.map(a => a.id === answerId ? updater(a) : a) })));
  };

  const handleLike = async (postId: string) => {
    if (!user) { toast({ title: "Authentication required", description: "Please sign in.", variant: "destructive" }); navigate('/auth'); return; }
    const currentInteraction = interactions[postId];
    if (currentInteraction === 'like') return;
    setInteraction(postId, 'like');
    updatePostLocally(postId, p => ({ ...p, likes: p.likes + 1, dislikes: currentInteraction === 'dislike' ? p.dislikes - 1 : p.dislikes }));
    try {
      const { error } = await supabase.rpc('increment_post_likes' as any, { post_id: postId, user_id: user.id });
      if (error) throw error;
    } catch {
      setInteraction(postId, currentInteraction);
      updatePostLocally(postId, p => ({ ...p, likes: p.likes - 1, dislikes: currentInteraction === 'dislike' ? p.dislikes + 1 : p.dislikes }));
      toast({ title: "Error", description: "Failed to like post.", variant: "destructive" });
    }
  };

  const handleDislike = async (postId: string) => {
    if (!user) { toast({ title: "Authentication required", description: "Please sign in.", variant: "destructive" }); navigate('/auth'); return; }
    const currentInteraction = interactions[postId];
    if (currentInteraction === 'dislike') return;
    setInteraction(postId, 'dislike');
    updatePostLocally(postId, p => ({ ...p, dislikes: p.dislikes + 1, likes: currentInteraction === 'like' ? p.likes - 1 : p.likes }));
    try {
      const { error } = await supabase.rpc('increment_post_dislikes' as any, { post_id: postId, user_id: user.id });
      if (error) throw error;
    } catch {
      setInteraction(postId, currentInteraction);
      updatePostLocally(postId, p => ({ ...p, dislikes: p.dislikes - 1, likes: currentInteraction === 'like' ? p.likes + 1 : p.likes }));
      toast({ title: "Error", description: "Failed to dislike post.", variant: "destructive" });
    }
  };

  const handleReport = (postId: string, reason: string) => {
    if (!user) { toast({ title: "Authentication required", description: "Please sign in.", variant: "destructive" }); navigate('/auth'); return; }
    console.log('Report submitted for post:', postId, 'Reason:', reason);
    toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
  };

  const handleAnswerLike = async (answerId: string) => {
    if (!user) { toast({ title: "Authentication required", description: "Please sign in.", variant: "destructive" }); navigate('/auth'); return; }
    updateAnswerLocally(answerId, a => ({ ...a, likes: a.likes + 1 }));
    try {
      const { error } = await supabase.rpc('increment_answer_likes', { answer_id: answerId, user_id: user.id });
      if (error) throw error;
    } catch {
      updateAnswerLocally(answerId, a => ({ ...a, likes: a.likes - 1 }));
      toast({ title: "Error", description: "Failed to like answer.", variant: "destructive" });
    }
  };

  const handleAnswerDislike = async (answerId: string) => {
    if (!user) { toast({ title: "Authentication required", description: "Please sign in.", variant: "destructive" }); navigate('/auth'); return; }
    updateAnswerLocally(answerId, a => ({ ...a, dislikes: a.dislikes + 1 }));
    try {
      const { error } = await supabase.rpc('increment_answer_dislikes', { answer_id: answerId, user_id: user.id });
      if (error) throw error;
    } catch {
      updateAnswerLocally(answerId, a => ({ ...a, dislikes: a.dislikes - 1 }));
      toast({ title: "Error", description: "Failed to dislike answer.", variant: "destructive" });
    }
  };

  const handleAddAnswer = async (postId: string, answerContent: string) => {
    if (!user) { toast({ title: "Authentication required", description: "Please sign in.", variant: "destructive" }); navigate('/auth'); return; }
    try {
      const { error } = await supabase.from('answers').insert({ post_id: postId, user_id: user.id, content: answerContent }).select().single();
      if (error) throw error;
      await fetchPosts();
      toast({ title: "Answer posted!", description: "Your answer has been added successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to add answer.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Create Post Form */}
        <CreatePostForm onCreatePost={handleCreatePost} />

        <h2 className="text-lg font-semibold text-muted-foreground mb-4">Recent Posts (Last 10 Days)</h2>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No posts in the last 10 days. Be the first to ask a question!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onDislike={handleDislike}
                onReport={handleReport}
                onAddAnswer={handleAddAnswer}
                onAnswerLike={handleAnswerLike}
                onAnswerDislike={handleAnswerDislike}
                userInteraction={interactions[post.id] || null}
              />
            ))}
          </div>
        )}
      </div>
      <FloatingCreatePostButton onCreatePost={handleCreatePost} />
    </Layout>
  );
};

export default Homepage;
