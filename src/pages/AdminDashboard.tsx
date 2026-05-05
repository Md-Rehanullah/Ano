import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Shield, Trash2, FileText, Mail, Users, BarChart3, Eye, EyeOff,
  Pin, PinOff, Ban, AlertTriangle, History, UserX, UserSearch, ThumbsUp, MessageCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ReportRow { id: string; post_id: string; user_id: string; reason: string; status: string; created_at: string; post_title?: string; }
interface MsgRow { id: string; name: string; email: string; subject: string; message: string; status: string; created_at: string; }
interface ModPost { id: string; title: string; user_id: string | null; category: string; is_hidden: boolean; is_pinned: boolean; created_at: string; author_name?: string | null; }
interface BanRow { id: string; user_id: string; reason: string; banned_until: string | null; created_at: string; display_name?: string | null; }
interface WarnRow { id: string; user_id: string; message: string; acknowledged: boolean; created_at: string; display_name?: string | null; }
interface LogRow { id: string; actor_id: string; action: string; target_type: string | null; target_id: string | null; details: any; created_at: string; actor_name?: string | null; }
interface UserRow { user_id: string; display_name: string | null; email: string | null; created_at: string; post_count: number; comment_count: number; like_count: number; banned: boolean; }
interface UserDetail {
  posts: { id: string; title: string; category: string; created_at: string; is_hidden: boolean }[];
  comments: { id: string; content: string; post_id: string; post_title: string | null; created_at: string }[];
  likes: { post_id: string; post_title: string | null; created_at: string }[];
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [modPosts, setModPosts] = useState<ModPost[]>([]);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [warnings, setWarnings] = useState<WarnRow[]>([]);
  const [auditLog, setAuditLog] = useState<LogRow[]>([]);
  const [stats, setStats] = useState({ totalPosts: 0, totalUsers: 0, totalComments: 0, totalReports: 0, totalMessages: 0 });
  const [chartData, setChartData] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Users hub
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Ban / Warn dialog state
  const [banUserId, setBanUserId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<"1d" | "7d" | "30d" | "perm">("perm");
  const [warnUserId, setWarnUserId] = useState("");
  const [warnMessage, setWarnMessage] = useState("");

  const writeLog = async (action: string, target_type: string | null, target_id: string | null, details: any = {}) => {
    if (!user) return;
    await supabase.from("moderation_log").insert({ actor_id: user.id, action, target_type, target_id, details });
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      // Reports + post titles
      const { data: rep } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
      const reportPostIds = [...new Set((rep || []).map(r => r.post_id))];
      let titles: Record<string, string> = {};
      if (reportPostIds.length) {
        const { data: posts } = await supabase.from("posts").select("id, title").in("id", reportPostIds);
        titles = Object.fromEntries((posts || []).map(p => [p.id, p.title]));
      }
      setReports((rep || []).map(r => ({ ...r, post_title: titles[r.post_id] || "(deleted)" })));

      // Messages
      const { data: msg } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
      setMessages((msg || []) as any);

      // Moderation posts (recent 100, including hidden)
      const { data: mp } = await supabase
        .from("posts")
        .select("id, title, user_id, category, is_hidden, is_pinned, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      const postUserIds = [...new Set((mp || []).map(p => p.user_id).filter(Boolean) as string[])];
      let nameMap: Record<string, string> = {};
      if (postUserIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", postUserIds);
        nameMap = Object.fromEntries((profs || []).map(p => [p.user_id, p.display_name || ""]));
      }
      setModPosts((mp || []).map((p: any) => ({ ...p, author_name: p.user_id ? nameMap[p.user_id] : null })));

      // Bans
      const { data: bb } = await supabase.from("user_bans").select("*").order("created_at", { ascending: false });
      const banUserIds = [...new Set((bb || []).map((b: any) => b.user_id))];
      let banNames: Record<string, string> = {};
      if (banUserIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", banUserIds);
        banNames = Object.fromEntries((profs || []).map(p => [p.user_id, p.display_name || ""]));
      }
      setBans((bb || []).map((b: any) => ({ ...b, display_name: banNames[b.user_id] || null })));

      // Warnings
      const { data: ww } = await supabase.from("user_warnings").select("*").order("created_at", { ascending: false }).limit(100);
      const warnUserIds = [...new Set((ww || []).map((w: any) => w.user_id))];
      let warnNames: Record<string, string> = {};
      if (warnUserIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", warnUserIds);
        warnNames = Object.fromEntries((profs || []).map(p => [p.user_id, p.display_name || ""]));
      }
      setWarnings((ww || []).map((w: any) => ({ ...w, display_name: warnNames[w.user_id] || null })));

      // Audit log
      const { data: lg } = await supabase.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(200);
      const actorIds = [...new Set((lg || []).map((l: any) => l.actor_id))];
      let actorNames: Record<string, string> = {};
      if (actorIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", actorIds);
        actorNames = Object.fromEntries((profs || []).map(p => [p.user_id, p.display_name || ""]));
      }
      setAuditLog((lg || []).map((l: any) => ({ ...l, actor_name: actorNames[l.actor_id] || null })));

      // Stats
      const [postsCount, profilesCount, ansCount, msgCount] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        totalPosts: postsCount.count || 0,
        totalUsers: profilesCount.count || 0,
        totalComments: ansCount.count || 0,
        totalReports: (rep || []).length,
        totalMessages: msgCount.count || 0,
      });

      const { data: catData } = await supabase.from("posts").select("category");
      const counts: Record<string, number> = {};
      (catData || []).forEach((p: any) => { counts[p.category] = (counts[p.category] || 0) + 1; });
      setChartData(Object.entries(counts).map(([category, count]) => ({ category, count })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, authLoading, roleLoading]);

  const updateReport = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    await writeLog("resolve_report", "report", id, { status });
    toast({ title: `Report marked ${status}` });
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setReports(prev => prev.filter(r => r.post_id !== postId));
    setModPosts(prev => prev.filter(p => p.id !== postId));
    await writeLog("delete_post", "post", postId);
    toast({ title: "Post deleted" });
  };

  const toggleHide = async (post: ModPost) => {
    const next = !post.is_hidden;
    const { error } = await supabase.from("posts").update({ is_hidden: next }).eq("id", post.id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setModPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_hidden: next } : p));
    await writeLog(next ? "hide_post" : "unhide_post", "post", post.id);
    toast({ title: next ? "Post hidden" : "Post unhidden" });
  };

  const togglePin = async (post: ModPost) => {
    const next = !post.is_pinned;
    const { error } = await supabase.from("posts").update({ is_pinned: next }).eq("id", post.id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setModPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: next } : p));
    await writeLog(next ? "pin_post" : "unpin_post", "post", post.id);
    toast({ title: next ? "Post pinned" : "Post unpinned" });
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const submitBan = async () => {
    if (!user) return;
    if (!banUserId.trim() || !banReason.trim()) {
      toast({ title: "User ID and reason required", variant: "destructive" });
      return;
    }
    const until = banDuration === "perm" ? null
      : new Date(Date.now() + ({ "1d": 1, "7d": 7, "30d": 30 }[banDuration] || 0) * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("user_bans").upsert({
      user_id: banUserId.trim(),
      banned_by: user.id,
      reason: banReason.trim(),
      banned_until: until,
    }, { onConflict: "user_id" });
    if (error) { toast({ title: "Ban failed", description: error.message, variant: "destructive" }); return; }
    await writeLog("ban_user", "user", banUserId.trim(), { reason: banReason, banned_until: until });
    toast({ title: "User banned" });
    setBanUserId(""); setBanReason(""); setBanDuration("perm");
    loadAll();
  };

  const revokeBan = async (ban: BanRow) => {
    if (!confirm("Lift this ban?")) return;
    const { error } = await supabase.from("user_bans").delete().eq("id", ban.id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setBans(prev => prev.filter(b => b.id !== ban.id));
    await writeLog("unban_user", "user", ban.user_id);
    toast({ title: "Ban lifted" });
  };

  const submitWarning = async () => {
    if (!user) return;
    if (!warnUserId.trim() || !warnMessage.trim()) {
      toast({ title: "User ID and message required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_warnings").insert({
      user_id: warnUserId.trim(),
      issued_by: user.id,
      message: warnMessage.trim(),
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await writeLog("warn_user", "user", warnUserId.trim(), { message: warnMessage });
    toast({ title: "Warning sent" });
    setWarnUserId(""); setWarnMessage("");
    loadAll();
  };

  if (authLoading || roleLoading || loading) {
    return <Layout><div className="container py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto py-16 max-w-md text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Admin access required</h1>
          <p className="text-muted-foreground text-sm">You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Posts", value: stats.totalPosts, icon: FileText },
            { label: "Users", value: stats.totalUsers, icon: Users },
            { label: "Comments", value: stats.totalComments, icon: FileText },
            { label: "Reports", value: stats.totalReports, icon: Shield },
            { label: "Messages", value: stats.totalMessages, icon: Mail },
          ].map(s => (
            <Card key={s.label} className="p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <s.icon className="h-5 w-5 text-primary opacity-60" />
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="flex flex-wrap max-w-full mb-6 h-auto">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="bans"><Ban className="h-3.5 w-3.5 mr-1" />Bans</TabsTrigger>
            <TabsTrigger value="warnings"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Warnings</TabsTrigger>
            <TabsTrigger value="audit"><History className="h-3.5 w-3.5 mr-1" />Audit Log</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" />Analytics</TabsTrigger>
          </TabsList>

          {/* Reports */}
          <TabsContent value="reports">
            <Card className="p-4 shadow-card overflow-x-auto">
              {reports.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No reports yet.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-xs truncate font-medium">{r.post_title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.reason}</TableCell>
                        <TableCell><Badge variant={r.status === "resolved" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                        <TableCell className="text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {r.status !== "resolved" && (
                            <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "resolved")}>Resolve</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deletePost(r.post_id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Moderation: hide / pin / delete posts */}
          <TabsContent value="moderation">
            <Card className="p-4 shadow-card overflow-x-auto">
              <p className="text-xs text-muted-foreground mb-3">
                Hidden posts are invisible to everyone except admins and the author. Pinned posts appear at the top of the feed.
              </p>
              {modPosts.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No posts.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modPosts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-xs truncate font-medium">{p.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.author_name || "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.category}</Badge></TableCell>
                        <TableCell className="space-x-1">
                          {p.is_hidden && <Badge variant="destructive" className="text-[10px]">Hidden</Badge>}
                          {p.is_pinned && <Badge className="text-[10px]">Pinned</Badge>}
                          {!p.is_hidden && !p.is_pinned && <span className="text-xs text-muted-foreground">visible</span>}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => toggleHide(p)} title={p.is_hidden ? "Unhide" : "Hide"}>
                            {p.is_hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => togglePin(p)} title={p.is_pinned ? "Unpin" : "Pin"}>
                            {p.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deletePost(p.id)} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Bans */}
          <TabsContent value="bans">
            <Card className="p-4 shadow-card space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><UserX className="h-4 w-4" /> Ban a user</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ban a user</DialogTitle>
                    <DialogDescription>Banned users cannot create posts or comments.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>User ID (auth user UUID)</Label>
                      <Input value={banUserId} onChange={e => setBanUserId(e.target.value)} placeholder="00000000-0000-…" />
                    </div>
                    <div className="space-y-1">
                      <Label>Reason</Label>
                      <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Spam / harassment" className="min-h-20" />
                    </div>
                    <div className="space-y-1">
                      <Label>Duration</Label>
                      <div className="flex gap-2 flex-wrap">
                        {(["1d", "7d", "30d", "perm"] as const).map(d => (
                          <Button key={d} type="button" size="sm" variant={banDuration === d ? "default" : "outline"} onClick={() => setBanDuration(d)}>
                            {d === "perm" ? "Permanent" : d}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitBan} variant="destructive">Confirm Ban</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {bans.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No active bans.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Until</TableHead>
                      <TableHead>Banned</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bans.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{b.display_name || "(no name)"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{b.user_id}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{b.reason}</TableCell>
                        <TableCell className="text-xs">{b.banned_until ? new Date(b.banned_until).toLocaleDateString() : <Badge variant="destructive" className="text-[10px]">Permanent</Badge>}</TableCell>
                        <TableCell className="text-xs">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => revokeBan(b)}>Lift ban</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Warnings */}
          <TabsContent value="warnings">
            <Card className="p-4 shadow-card space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><AlertTriangle className="h-4 w-4" /> Send warning</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Warn a user</DialogTitle>
                    <DialogDescription>The user will see this message in their profile.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>User ID</Label>
                      <Input value={warnUserId} onChange={e => setWarnUserId(e.target.value)} placeholder="auth user UUID" />
                    </div>
                    <div className="space-y-1">
                      <Label>Message</Label>
                      <Textarea value={warnMessage} onChange={e => setWarnMessage(e.target.value)} placeholder="Please follow community guidelines…" className="min-h-24" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitWarning}>Send Warning</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {warnings.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No warnings issued yet.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warnings.map(w => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{w.display_name || "(no name)"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{w.user_id}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-md whitespace-pre-wrap">{w.message}</TableCell>
                        <TableCell>
                          <Badge variant={w.acknowledged ? "secondary" : "outline"} className="text-[10px]">
                            {w.acknowledged ? "Acknowledged" : "Unread"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Audit Log */}
          <TabsContent value="audit">
            <Card className="p-4 shadow-card overflow-x-auto">
              {auditLog.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No moderation actions yet.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{l.actor_name || l.actor_id.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{l.action}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {l.target_type ? <><span className="text-muted-foreground">{l.target_type}: </span><span className="font-mono">{l.target_id?.slice(0, 8)}</span></> : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {l.details ? JSON.stringify(l.details) : ""}
                        </TableCell>
                        <TableCell className="text-xs">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <Card className="p-4 shadow-card">
              {messages.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No messages yet.</p> : (
                <div className="space-y-3">
                  {messages.map(m => (
                    <Card key={m.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="font-semibold">{m.subject}</p>
                          <p className="text-xs text-muted-foreground">{m.name} &lt;{m.email}&gt; · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteMessage(m.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="p-6 shadow-card">
              <h3 className="font-semibold mb-4">Posts by Category</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
