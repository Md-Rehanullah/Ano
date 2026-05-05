import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import UserAvatar from "@/components/UserAvatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, FileText, MessageCircle, ThumbsUp, ArrowLeft, MapPin, Twitter, Instagram, Facebook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import KarmaBadges from "@/components/KarmaBadges";
import type { KarmaStats } from "@/lib/badges";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  x_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
}
interface PostItem { id: string; title: string; description: string; category: string; likes: number; created_at: string; }
interface AnswerItem { id: string; content: string; created_at: string; post: { id: string; title: string } | null; }

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [karma, setKarma] = useState<KarmaStats>({ posts: 0, likes: 0, answers: 0, karma: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio, location, x_url, instagram_url, facebook_url")
        .eq("user_id", userId)
        .maybeSingle();
      setProfile(prof as any);

      const { data: postsData } = await supabase
        .from("posts")
        .select("id, title, description, category, likes, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setPosts(postsData || []);

      const { data: answersData } = await supabase
        .from("answers")
        .select("id, content, created_at, posts!answers_post_id_fkey(id, title)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setAnswers(
        (answersData || []).map((a: any) => ({
          id: a.id,
          content: a.content,
          created_at: a.created_at,
          post: a.posts ? { id: a.posts.id, title: a.posts.title } : null,
        }))
      );

      const { data: karmaRow } = await supabase
        .from("user_karma" as any)
        .select("posts_count, likes_received, karma")
        .eq("user_id", userId)
        .maybeSingle();
      const ansCount = (answersData || []).length;
      setKarma({
        posts: (karmaRow as any)?.posts_count || 0,
        likes: (karmaRow as any)?.likes_received || 0,
        answers: ansCount,
        karma: (karmaRow as any)?.karma || 0,
      });

      setLoading(false);
    })();
  }, [userId]);

  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Card className="p-6 mb-6 shadow-card">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <UserAvatar src={profile?.avatar_url} name={profile?.display_name} className="h-20 w-20" fallbackClassName="text-2xl" />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold mb-1">{profile?.display_name || "User"}</h1>
              {profile?.bio ? (
                <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{profile.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic mb-3">No bio yet.</p>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{posts.length} Posts</Badge>
                <Badge variant="secondary" className="gap-1"><MessageCircle className="h-3 w-3" />{answers.length} Comments</Badge>
                <Badge variant="secondary" className="gap-1"><ThumbsUp className="h-3 w-3" />{totalLikes} Likes</Badge>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t">
            <KarmaBadges stats={karma} />
          </div>
        </Card>

        <Tabs defaultValue="posts">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-3 mt-4">
            {loading ? (
              <Card className="p-6 text-center text-muted-foreground">Loading...</Card>
            ) : posts.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No posts yet.</Card>
            ) : (
              posts.map(p => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold">{p.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">{p.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{p.likes}</span>
                    <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 mt-4">
            {loading ? (
              <Card className="p-6 text-center text-muted-foreground">Loading...</Card>
            ) : answers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No comments yet.</Card>
            ) : (
              answers.map(a => (
                <Card key={a.id} className="p-4">
                  {a.post && <p className="text-xs text-muted-foreground mb-1">on <span className="font-medium text-foreground">{a.post.title}</span></p>}
                  <p className="text-sm">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

// Private (seed) profile page
export const PrivateProfile = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">This profile is private</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The author has chosen to keep their profile private.
          </p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </Card>
      </div>
    </Layout>
  );
};

export default UserProfile;
