// Edge function: admin lists all users with email + activity counts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("admin-list-users: missing Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
      console.error("admin-list-users: missing env", {
        hasUrl: !!SUPABASE_URL, hasAnon: !!ANON_KEY, hasService: !!SERVICE_ROLE,
      });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is an admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Page through auth users (up to 1000)
    const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return new Response(JSON.stringify({ error: listErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const users = usersPage.users;
    const ids = users.map((u) => u.id);

    // Profiles + counts in parallel
    const [{ data: profs }, { data: posts }, { data: answers }, { data: likes }, { data: bans }] = await Promise.all([
      admin.from("profiles").select("user_id, display_name").in("user_id", ids),
      admin.from("posts").select("user_id").in("user_id", ids),
      admin.from("answers").select("user_id").in("user_id", ids),
      admin.from("liked_posts").select("user_id").in("user_id", ids),
      admin.from("user_bans").select("user_id, banned_until").in("user_id", ids),
    ]);

    const nameMap = new Map((profs || []).map((p) => [p.user_id, p.display_name]));
    const count = (rows: any[] | null) => {
      const m = new Map<string, number>();
      (rows || []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) || 0) + 1));
      return m;
    };
    const postCnt = count(posts);
    const ansCnt = count(answers);
    const likeCnt = count(likes);
    const now = Date.now();
    const banned = new Set(
      (bans || [])
        .filter((b: any) => !b.banned_until || new Date(b.banned_until).getTime() > now)
        .map((b: any) => b.user_id)
    );

    const result = users.map((u) => ({
      user_id: u.id,
      email: u.email ?? null,
      display_name: nameMap.get(u.id) ?? null,
      created_at: u.created_at,
      post_count: postCnt.get(u.id) || 0,
      comment_count: ansCnt.get(u.id) || 0,
      like_count: likeCnt.get(u.id) || 0,
      banned: banned.has(u.id),
    }));

    return new Response(JSON.stringify({ users: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
