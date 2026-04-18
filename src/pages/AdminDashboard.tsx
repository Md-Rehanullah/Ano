import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Trash2, FileText, Mail, Users, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ReportRow { id: string; post_id: string; user_id: string; reason: string; status: string; created_at: string; post_title?: string; }
interface MsgRow { id: string; name: string; email: string; subject: string; message: string; status: string; created_at: string; }

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [stats, setStats] = useState({ totalPosts: 0, totalUsers: 0, totalComments: 0, totalReports: 0, totalMessages: 0 });
  const [chartData, setChartData] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      try {
        // Reports + post titles
        const { data: rep } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
        const postIds = [...new Set((rep || []).map(r => r.post_id))];
        let titles: Record<string, string> = {};
        if (postIds.length) {
          const { data: posts } = await supabase.from("posts").select("id, title").in("id", postIds);
          titles = Object.fromEntries((posts || []).map(p => [p.id, p.title]));
        }
        setReports((rep || []).map(r => ({ ...r, post_title: titles[r.post_id] || "(deleted)" })));

        // Contact messages
        const { data: msg } = await supabase.from("contact_messages" as any).select("*").order("created_at", { ascending: false }).limit(200);
        setMessages((msg || []) as any);

        // Stats
        const [postsCount, profilesCount, ansCount, msgCount] = await Promise.all([
          supabase.from("posts").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("answers").select("id", { count: "exact", head: true }),
          supabase.from("contact_messages" as any).select("id", { count: "exact", head: true }),
        ]);
        setStats({
          totalPosts: postsCount.count || 0,
          totalUsers: profilesCount.count || 0,
          totalComments: ansCount.count || 0,
          totalReports: (rep || []).length,
          totalMessages: msgCount.count || 0,
        });

        // Chart: posts per category
        const { data: catData } = await supabase.from("posts").select("category");
        const counts: Record<string, number> = {};
        (catData || []).forEach((p: any) => { counts[p.category] = (counts[p.category] || 0) + 1; });
        setChartData(Object.entries(counts).map(([category, count]) => ({ category, count })));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  const updateReport = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast({ title: `Report marked ${status}` });
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setReports(prev => prev.filter(r => r.post_id !== postId));
    toast({ title: "Post deleted" });
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("contact_messages" as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setMessages(prev => prev.filter(m => m.id !== id));
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
          <p className="text-muted-foreground text-sm">You don't have permission to view this page. Ask an existing admin to grant you the <code>admin</code> role in the <code>user_roles</code> table.</p>
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
          <TabsList className="grid grid-cols-4 max-w-2xl mb-6">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

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

          <TabsContent value="users">
            <Card className="p-6 shadow-card text-sm text-muted-foreground">
              <p>Total registered users: <strong className="text-foreground">{stats.totalUsers}</strong></p>
              <p className="mt-2">Detailed user list and role management coming soon. To grant admin access today, run this SQL in the Supabase SQL editor:</p>
              <pre className="bg-muted p-3 rounded mt-2 text-xs overflow-x-auto">{`INSERT INTO public.user_roles (user_id, role)
VALUES ('<user-uuid>', 'admin');`}</pre>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
