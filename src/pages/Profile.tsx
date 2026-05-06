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
import { User, FileText, MessageCircle, ThumbsUp, Calendar, Settings, Trash2, Loader2, MapPin, Twitter, Instagram, Facebook, Heart } from "lucide-react";
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
  post: { id: string; title: string };
}

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  location: string | null;
  x_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
}

const normalizeUrl = (u: string | null | undefined) => {
  if (!u) return null;
  const t = u.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
};

const Profile = () => {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
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
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, banner_url, bio, location, x_url, instagram_url, facebook_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      setUserProfile(profileData as any);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`*, answers (*)`)
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
        answers: (post.answers || []).map((a: any) => ({
          id: a.id, content: a.content, likes: a.likes, dislikes: a.dislikes, replies: [], created_at: a.created_at,
        })),
      }));
      setUserPosts(transformedPosts);

      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select(`id, content, likes, dislikes, created_at, post_id, posts!answers_post_id_fkey ( id, title )`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (answersError) throw answersError;

      const transformedAnswers: UserAnswer[] = (answersData || []).map((a: any) => ({
        id: a.id, content: a.content, likes: a.likes, dislikes: a.dislikes, created_at: a.created_at,
        post: { id: a.posts?.id || a.post_id, title: a.posts?.title || 'Unknown Post' },
      }));
      setUserAnswers(transformedAnswers);

      // Liked posts (from new liked_posts table)
      const { data: likedRows } = await supabase
        .from('liked_posts' as any)
        .select('post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const likedIds = (likedRows || []).map((r: any) => r.post_id);
      let likedTransformed: Post[] = [];
      if (likedIds.length) {
        const { data: lp } = await supabase
          .from('posts')
          .select(`*, answers (id)`)
          .in('id', likedIds);
        const order = new Map(likedIds.map((id, i) => [id, i]));
        likedTransformed = (lp || [])
          .map((p: any) => ({
            id: p.id, title: p.title, description: p.description, category: p.category,
            likes: p.likes, dislikes: p.dislikes, imageUrl: p.image_url, created_at: p.created_at,
            answers: (p.answers || []).map((a: any) => ({ id: a.id, content: '', likes: 0, dislikes: 0, replies: [], created_at: '' })),
          }))
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      }
      setLikedPosts(likedTransformed);

      const totalLikesReceived =
        transformedPosts.reduce((acc, p) => acc + p.likes, 0) +
        transformedAnswers.reduce((acc, a) => acc + a.likes, 0);
      setStats({
        totalPosts: transformedPosts.length,
        totalAnswers: transformedAnswers.length,
        totalLikesReceived,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({ title: "Error", description: "Failed to load your profile data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPost = async (postId: string, data: { title: string; description: string; category: string }) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('posts')
        .update({ title: data.title, description: data.description, category: data.category })
        .eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      await fetchUserData();
      toast({ title: "Post updated", description: "Your post has been updated successfully." });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({ title: "Error", description: "Failed to update post.", variant: "destructive" });
      throw error;
    }
  };

  const handleDeletePost = async () => {
    if (!user || !deletePost) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', deletePost.id).eq('user_id', user.id);
      if (error) throw error;
      await fetchUserData();
      setDeletePost(null);
      toast({ title: "Post deleted", description: "Your post has been deleted successfully." });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!user) return;
    setDeletingAnswerId(answerId);
    try {
      const { error } = await supabase.from('answers').delete().eq('id', answerId).eq('user_id', user.id);
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
          <div className="space-y-6">{[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}</div>
        </div>
      </Layout>
    );
  }
  if (!user) return null;

  const xLink = normalizeUrl(userProfile?.x_url);
  const igLink = normalizeUrl(userProfile?.instagram_url);
  const fbLink = normalizeUrl(userProfile?.facebook_url);
  const hasSocial = !!(xLink || igLink || fbLink);

  return (
    <Layout>
      <div className="container mx-auto px-4 pb-10 max-w-4xl">
        {/* Hero Header */}
        <Card className="overflow-hidden mb-6 shadow-card">
          <div className="h-32 sm:h-40 bg-gradient-to-br from-primary/80 via-primary to-primary/60 relative" />
          <div className="px-6 pb-6 -mt-14 sm:-mt-16 flex flex-col items-center text-center">
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-elegant">
              <AvatarImage src={userProfile?.avatar_url || undefined} alt="Profile avatar" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-3xl">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold mt-3">{userProfile?.display_name || "My Profile"}</h1>
            {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
            {userProfile?.location && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {userProfile.location}
              </p>
            )}
            {userProfile?.bio ? (
              <p className="text-sm text-foreground/80 max-w-xl mt-3 whitespace-pre-wrap">{userProfile.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-3">No bio yet — add one in Settings.</p>
            )}

            {hasSocial && (
              <div className="flex items-center gap-2 mt-4">
                {xLink && (
                  <a href={xLink} target="_blank" rel="noopener noreferrer" aria-label="X profile"
                     className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {igLink && (
                  <a href={igLink} target="_blank" rel="noopener noreferrer" aria-label="Instagram profile"
                     className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {fbLink && (
                  <a href={fbLink} target="_blank" rel="noopener noreferrer" aria-label="Facebook profile"
                     className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 mt-5">
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <FileText className="h-3 w-3" /> {stats.totalPosts} Posts
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <MessageCircle className="h-3 w-3" /> {stats.totalAnswers} Comments
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <ThumbsUp className="h-3 w-3" /> {stats.totalLikesReceived} Likes Received
              </Badge>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="answers">Comments</TabsTrigger>
            <TabsTrigger value="liked" className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> Liked
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <div className="space-y-6">
              {isLoading ? (
                [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
              ) : userPosts.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't created any posts yet.</p>
                </Card>
              ) : (
                userPosts.map((post) => (
                  <ProfilePostCard key={post.id} post={post} onEdit={setEditPost} onDelete={setDeletePost} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="answers">
            <div className="space-y-4">
              {isLoading ? (
                [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
              ) : userAnswers.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't commented on any posts yet.</p>
                </Card>
              ) : (
                userAnswers.map((answer) => (
                  <Card key={answer.id} className="p-4 shadow-card">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-muted-foreground">
                          Commented on:{" "}
                          <button
                            className="font-medium text-foreground hover:text-primary text-left"
                            onClick={() => navigate(`/post/${answer.post.id}`)}
                          >
                            {answer.post.title}
                          </button>
                        </p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">{answer.content}</p>
                      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {answer.likes} likes
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                              {deletingAnswerId === answer.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAnswer(answer.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="liked">
            <div className="space-y-4">
              {isLoading ? (
                [...Array(2)].map((_, i) => <PostCardSkeleton key={i} />)
              ) : likedPosts.length === 0 ? (
                <Card className="p-8 text-center">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't liked any posts yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Posts you like are saved here for easy access.</p>
                </Card>
              ) : (
                likedPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="p-4 shadow-card hover:shadow-elegant transition-all cursor-pointer"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <div className="flex gap-4">
                      {post.imageUrl && (
                        <img src={post.imageUrl} alt={post.title} className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold line-clamp-2">{post.title}</h3>
                          <Badge variant="outline" className="text-[10px] shrink-0">{post.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.likes}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.answers.length}</span>
                          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
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
              email={user.email}
              displayName={userProfile?.display_name || null}
              avatarUrl={userProfile?.avatar_url || null}
              bio={userProfile?.bio || null}
              location={userProfile?.location || null}
              xUrl={userProfile?.x_url || null}
              instagramUrl={userProfile?.instagram_url || null}
              facebookUrl={userProfile?.facebook_url || null}
              onUpdate={fetchUserData}
            />
          </TabsContent>
        </Tabs>

        <EditPostDialog
          post={editPost}
          open={!!editPost}
          onOpenChange={(open) => !open && setEditPost(null)}
          onSave={handleEditPost}
        />
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
