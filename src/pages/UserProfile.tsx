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
        .select("display_name, avatar_url, banner_url, bio, location, x_url, instagram_url, facebook_url")
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

        <Card className="overflow-hidden mb-6 shadow-card">
          <div
            className="h-28 sm:h-40 bg-gradient-to-br from-primary/80 via-primary to-primary/60 bg-cover bg-center"
            style={(profile as any)?.banner_url ? (
              ((profile as any).banner_url as string).startsWith("linear-gradient")
                ? { backgroundImage: (profile as any).banner_url }
                : { backgroundImage: `url(${(profile as any).banner_url})` }
            ) : undefined}
          />
          <div className="px-6 pb-6 -mt-12 sm:-mt-14 flex flex-col items-center text-center">
            <div className="rounded-full ring-4 ring-background">
              <UserAvatar src={profile?.avatar_url} name={profile?.display_name} className="h-24 w-24" fallbackClassName="text-2xl" />
            </div>
            <h1 className="text-2xl font-bold mt-3">{profile?.display_name || "User"}</h1>
            {profile?.location && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </p>
            )}
            {profile?.bio ? (
              <p className="text-sm text-muted-foreground max-w-xl mt-3 whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-3">No bio yet.</p>
            )}

            {(() => {
              const norm = (u?: string | null) => {
                if (!u) return null;
                const t = u.trim();
                if (!t) return null;
                return /^https?:\/\//i.test(t) ? t : `https://${t}`;
              };
              const xL = norm(profile?.x_url);
              const igL = norm(profile?.instagram_url);
              const fbL = norm(profile?.facebook_url);
              if (!xL && !igL && !fbL) return null;
              return (
                <div className="flex items-center gap-2 mt-4">
                  {xL && <a href={xL} target="_blank" rel="noopener noreferrer" aria-label="X" className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Twitter className="h-4 w-4" /></a>}
                  {igL && <a href={igL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Instagram className="h-4 w-4" /></a>}
                  {fbL && <a href={fbL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="h-9 w-9 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Facebook className="h-4 w-4" /></a>}
                </div>
              );
            })()}

            <div className="flex flex-wrap justify-center gap-2 mt-5">
              <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{posts.length} Posts</Badge>
              <Badge variant="secondary" className="gap-1"><MessageCircle className="h-3 w-3" />{answers.length} Comments</Badge>
              <Badge variant="secondary" className="gap-1"><ThumbsUp className="h-3 w-3" />{totalLikes} Likes</Badge>
            </div>
            <div className="mt-5 pt-4 border-t w-full">
              <KarmaBadges stats={karma} />
            </div>
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
