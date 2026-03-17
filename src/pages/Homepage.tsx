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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // Get user interactions for all posts
  const postIds = posts.map(post => post.id);
  const { interactions, setInteraction } = useUserInteractions(postIds);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          answers (
            *
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        toast({
          title: "Error",
          description: "Failed to load posts. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Fetch all relevant user profiles for posts and answers
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
      toast({
        title: "Error",
        description: "Failed to load posts. Please try again.",
        variant: "destructive",
      });
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
    if (!user) {
      navigate('/auth');
      return;
    }

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
        console.error('Error creating post:', error);
        toast({
          title: "Error",
          description: "Failed to create post. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Add the new post to the local state
      const newPost: Post = {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        likes: data.likes,
        dislikes: data.dislikes,
        imageUrl: data.image_url,
        created_at: data.created_at,
        answers: []
      };

      setPosts(prevPosts => [newPost, ...prevPosts]);
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updatePostLocally = (postId: string, updater: (post: Post) => Post) => {
    setPosts(prev => prev.map(p => p.id === postId ? updater(p) : p));
  };

  const updateAnswerLocally = (answerId: string, updater: (answer: Answer) => Answer) => {
    setPosts(prev => prev.map(p => ({
      ...p,
      answers: p.answers.map(a => a.id === answerId ? updater(a) : a)
    })));
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to like posts.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    const currentInteraction = interactions[postId];
    if (currentInteraction === 'like') return;
    setInteraction(postId, 'like');
    updatePostLocally(postId, p => ({
      ...p,
      likes: p.likes + 1,
      dislikes: currentInteraction === 'dislike' ? p.dislikes - 1 : p.dislikes,
    }));
    try {
      const { error } = await supabase.rpc('increment_post_likes' as any, { post_id: postId, user_id: user.id });
      if (error) throw error;
    } catch (error) {
      console.error('Error liking post:', error);
      setInteraction(postId, currentInteraction);
      updatePostLocally(postId, p => ({
        ...p,
        likes: p.likes - 1,
        dislikes: currentInteraction === 'dislike' ? p.dislikes + 1 : p.dislikes,
      }));
      toast({ title: "Error", description: "Failed to like post.", variant: "destructive" });
    }
  };

  const handleDislike = async (postId: string) => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to dislike posts.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    const currentInteraction = interactions[postId];
    if (currentInteraction === 'dislike') return;
    setInteraction(postId, 'dislike');
    updatePostLocally(postId, p => ({
      ...p,
      dislikes: p.dislikes + 1,
      likes: currentInteraction === 'like' ? p.likes - 1 : p.likes,
    }));
    try {
      const { error } = await supabase.rpc('increment_post_dislikes' as any, { post_id: postId, user_id: user.id });
      if (error) throw error;
    } catch (error) {
      console.error('Error disliking post:', error);
      setInteraction(postId, currentInteraction);
      updatePostLocally(postId, p => ({
        ...p,
        dislikes: p.dislikes - 1,
        likes: currentInteraction === 'like' ? p.likes + 1 : p.likes,
      }));
      toast({ title: "Error", description: "Failed to dislike post.", variant: "destructive" });
    }
  };

  const handleReport = (postId: string, reason: string) => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to report posts.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    console.log('Report submitted for post:', postId, 'Reason:', reason);
    toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
  };

  const handleAnswerLike = async (answerId: string) => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to like answers.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    updateAnswerLocally(answerId, a => ({ ...a, likes: a.likes + 1 }));
    try {
      const { error } = await supabase.rpc('increment_answer_likes', { answer_id: answerId, user_id: user.id });
      if (error) throw error;
    } catch (error) {
      console.error('Error liking answer:', error);
      updateAnswerLocally(answerId, a => ({ ...a, likes: a.likes - 1 }));
      toast({ title: "Error", description: "Failed to like answer.", variant: "destructive" });
    }
  };

  const handleAnswerDislike = async (answerId: string) => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to dislike answers.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    updateAnswerLocally(answerId, a => ({ ...a, dislikes: a.dislikes + 1 }));
    try {
      const { error } = await supabase.rpc('increment_answer_dislikes', { answer_id: answerId, user_id: user.id });
      if (error) throw error;
    } catch (error) {
      console.error('Error disliking answer:', error);
      updateAnswerLocally(answerId, a => ({ ...a, dislikes: a.dislikes - 1 }));
      toast({ title: "Error", description: "Failed to dislike answer.", variant: "destructive" });
    }
  };

  const handleAddAnswer = async (postId: string, answerContent: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add answers.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('answers')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: answerContent
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding answer:', error);
        toast({
          title: "Error",
          description: "Failed to add answer. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Refresh posts to show the new answer
      await fetchPosts();
      
      toast({
        title: "Answer posted!",
        description: "Your answer has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding answer:', error);
      toast({
        title: "Error",
        description: "Failed to add answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get categorized posts
  const latestPosts = [...posts].slice(0, 5);
  const trendingPosts = [...posts]
    .sort((a, b) => (b.likes + b.answers.length) - (a.likes + a.answers.length))
    .slice(0, 5);
  const mostAnsweredPosts = [...posts]
    .sort((a, b) => b.answers.length - a.answers.length)
    .slice(0, 5);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="bg-gradient-hero text-white rounded-2xl p-8 shadow-glow">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Ask Anything, Share Everything
            </h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              A place where curiosity meets knowledge. Ask questions, share insights, 
              and connect with others - all completely anonymous.
            </p>
          </div>
        </div>

        {/* Create Post Form */}
        <CreatePostForm onCreatePost={handleCreatePost} />

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No posts yet. Be the first to ask a question!</p>
          </div>
        ) : (
          <>
            {/* Latest, Trending, and Most Answered Posts Tabs */}
            <Tabs defaultValue="latest" className="mb-12">
              <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
                <TabsTrigger value="latest">Latest Posts</TabsTrigger>
                <TabsTrigger value="trending">Trending Posts</TabsTrigger>
                <TabsTrigger value="most-answered">Most Answered</TabsTrigger>
              </TabsList>
              
              <TabsContent value="latest">
                <div className="space-y-6">
                  {latestPosts.map((post) => (
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
              </TabsContent>
              
              <TabsContent value="trending">
                <div className="space-y-6">
                  {trendingPosts.map((post) => (
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
              </TabsContent>
              
              <TabsContent value="most-answered">
                <div className="space-y-6">
                  {mostAnsweredPosts.map((post) => (
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
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      <FloatingCreatePostButton onCreatePost={handleCreatePost} />
    </Layout>
  );
};

export default Homepage;