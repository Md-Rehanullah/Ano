import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ProfilePostCard from "@/components/ProfilePostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import EditPostDialog from "@/components/EditPostDialog";
import DeletePostDialog from "@/components/DeletePostDialog";
import ProfileSettings from "@/components/ProfileSettings";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User, FileText, MessageCircle, ThumbsUp, Calendar, Settings, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Answer {
  id: string;
  content: string;
  likes: number;
  dislikes: number;
  replies: Answer[];
  created_at: string;
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
}

interface UserAnswer {
  id: string;
  content: string;
  likes: number;
  dislikes: number;
  created_at: string;
  post: {
    id: string;
    title: string;
  };
}

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalAnswers: 0,
    totalLikesReceived: 0,
  });
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [deletePost, setDeletePost] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setUserProfile(profileData);

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          answers (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const transformedPosts: Post[] = (postsData || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        category: post.category,
        likes: post.likes,
        dislikes: post.dislikes,
        imageUrl: post.image_url,
        created_at: post.created_at,
        answers: (post.answers || []).map((answer: any) => ({
          id: answer.id,
          content: answer.content,
          likes: answer.likes,
          dislikes: answer.dislikes,
          replies: [],
          created_at: answer.created_at
        }))
      }));

      setUserPosts(transformedPosts);

      // Fetch user's answers with post info
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select(`
          id,
          content,
          likes,
          dislikes,
          created_at,
          post_id,
          posts!answers_post_id_fkey (
            id,
            title
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (answersError) throw answersError;

      const transformedAnswers: UserAnswer[] = (answersData || []).map((answer: any) => ({
        id: answer.id,
        content: answer.content,
        likes: answer.likes,
        dislikes: answer.dislikes,
        created_at: answer.created_at,
        post: {
          id: answer.posts?.id || answer.post_id,
          title: answer.posts?.title || 'Unknown Post'
        }
      }));

      setUserAnswers(transformedAnswers);

      // Calculate stats
      const totalLikesReceived = transformedPosts.reduce((acc, post) => acc + post.likes, 0) +
        transformedAnswers.reduce((acc, answer) => acc + answer.likes, 0);

      setStats({
        totalPosts: transformedPosts.length,
        totalAnswers: transformedAnswers.length,
        totalLikesReceived,
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your profile data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPost = async (postId: string, data: { title: string; description: string; category: string }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: data.title,
          description: data.description,
          category: data.category,
        })
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchUserData();
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update post.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeletePost = async () => {
    if (!user || !deletePost) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', deletePost.id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchUserData();
      setDeletePost(null);
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!user) return;
    setDeletingAnswerId(answerId);
    try {
      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('id', answerId)
        .eq('user_id', user.id);
      if (error) throw error;
      setUserAnswers(prev => prev.filter(a => a.id !== answerId));
      toast({ title: "Comment deleted" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete comment.", variant: "destructive" });
    } finally {
      setDeletingAnswerId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="p-6 mb-8 shadow-card">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-20 w-20 border-4 border-primary/20">
              <AvatarImage src={userProfile?.avatar_url || undefined} alt="Profile avatar" />
              <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold mb-2">
                {userProfile?.display_name || "My Profile"}
              </h1>
              <p className="text-muted-foreground mb-4">
                View and manage your posts and activity
              </p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <FileText className="h-3 w-3" />
                  {stats.totalPosts} Posts
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <MessageCircle className="h-3 w-3" />
                  {stats.totalAnswers} Comments
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <ThumbsUp className="h-3 w-3" />
                  {stats.totalLikesReceived} Likes Received
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="posts">My Posts</TabsTrigger>
            <TabsTrigger value="answers">My Comments</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <div className="space-y-6">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))
              ) : userPosts.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    You haven't created any posts yet.
                  </p>
                </Card>
              ) : (
                userPosts.map((post) => (
                  <ProfilePostCard
                    key={post.id}
                    post={post}
                    onEdit={setEditPost}
                    onDelete={setDeletePost}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="answers">
            <div className="space-y-4">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))
              ) : userAnswers.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    You haven't commented on any posts yet.
                  </p>
                </Card>
              ) : (
                userAnswers.map((answer) => (
                  <Card key={answer.id} className="p-4 shadow-card">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-muted-foreground">
                          Commented on: <span className="font-medium text-foreground">{answer.post.title}</span>
                        </p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">{answer.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {answer.likes} likes
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <ProfileSettings
              userId={user.id}
              displayName={userProfile?.display_name || null}
              avatarUrl={userProfile?.avatar_url || null}
              onUpdate={fetchUserData}
            />
          </TabsContent>
        </Tabs>

        {/* Edit Post Dialog */}
        <EditPostDialog
          post={editPost}
          open={!!editPost}
          onOpenChange={(open) => !open && setEditPost(null)}
          onSave={handleEditPost}
        />

        {/* Delete Post Dialog */}
        <DeletePostDialog
          open={!!deletePost}
          onOpenChange={(open) => !open && setDeletePost(null)}
          onConfirm={handleDeletePost}
          postTitle={deletePost?.title || ""}
          isDeleting={isDeleting}
        />
      </div>
    </Layout>
  );
};

export default Profile;
