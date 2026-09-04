// Edge function: deletes the authenticated user and ALL of their data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized: missing bearer token" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: "Server not configured" }, 500);
    }

    const token = authHeader.slice("Bearer ".length).trim();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Validate the caller's token with the admin client (works with both
    // legacy JWT secrets and the new signing-key system).
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized: invalid session" }, 401);
    }
    const userId = userData.user.id;

    // 1) Remove every row that belongs to this user.
    const byUser: string[] = [
      "feed_impressions",
      "user_interests",
      "user_interactions",
      "answer_interactions",
      "liked_posts",
      "bookmarks",
      "poll_votes",
      "reports",
      "notifications",
      "user_badges",
      "user_warnings",
      "user_bans",
      "user_guide_seen",
      "user_roles",
      "contact_messages",
    ];
    const failures: string[] = [];
    for (const table of byUser) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) failures.push(`${table}: ${error.message}`);
    }

    // Notifications where the user was the actor
    await admin.from("notifications").delete().eq("actor_id", userId);
    // Blocks in both directions
    await admin.from("user_blocks").delete().eq("blocker_id", userId);
    await admin.from("user_blocks").delete().eq("blocked_id", userId);

    // 2) Posts / comments and their dependents.
    const { data: myPosts } = await admin
      .from("posts").select("id").eq("user_id", userId);
    const postIds = (myPosts ?? []).map((p: { id: string }) => p.id);

    if (postIds.length) {
      const { data: polls } = await admin
        .from("polls").select("id").in("post_id", postIds);
      const pollIds = (polls ?? []).map((p: { id: string }) => p.id);
      if (pollIds.length) {
        await admin.from("poll_votes").delete().in("poll_id", pollIds);
        await admin.from("poll_options").delete().in("poll_id", pollIds);
        await admin.from("polls").delete().in("id", pollIds);
      }
      await admin.from("feed_impressions").delete().in("post_id", postIds);
      await admin.from("bookmarks").delete().in("post_id", postIds);
      await admin.from("liked_posts").delete().in("post_id", postIds);
      await admin.from("user_interactions").delete().in("post_id", postIds);
      await admin.from("reports").delete().in("post_id", postIds);
      await admin.from("notifications").delete().in("post_id", postIds);

      const { data: postAnswers } = await admin
        .from("answers").select("id").in("post_id", postIds);
      const answerIds = (postAnswers ?? []).map((a: { id: string }) => a.id);
      if (answerIds.length) {
        await admin.from("answer_interactions").delete().in("answer_id", answerIds);
        await admin.from("notifications").delete().in("answer_id", answerIds);
      }
      // child replies first, then all answers on those posts
      await admin.from("answers").delete().in("post_id", postIds).not("parent_id", "is", null);
      await admin.from("answers").delete().in("post_id", postIds);
    }

    // Comments the user left on other people's posts
    const { data: myAnswers } = await admin
      .from("answers").select("id").eq("user_id", userId);
    const myAnswerIds = (myAnswers ?? []).map((a: { id: string }) => a.id);
    if (myAnswerIds.length) {
      await admin.from("answer_interactions").delete().in("answer_id", myAnswerIds);
      await admin.from("notifications").delete().in("answer_id", myAnswerIds);
      await admin.from("answers").delete().in("parent_id", myAnswerIds);
      await admin.from("answers").delete().in("id", myAnswerIds);
    }

    const { error: postsErr } = await admin.from("posts").delete().eq("user_id", userId);
    if (postsErr) failures.push(`posts: ${postsErr.message}`);

    // 3) Storage: avatars, banners and post media owned by the user.
   for (const bucket of ["avatars", "banners", "post-images", "post-files"]) {
      for (const prefix of [userId, `${userId}/videos`, `${userId}/files`]) {
        const { data: files } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
        const paths = (files ?? [])
          .filter((f) => f.id !== null)
          .map((f) => `${prefix}/${f.name}`);
        if (paths.length) await admin.storage.from(bucket).remove(paths);
      }
    }

    // 4) Profile (name, bio, age, socials, college, avatar, banner…)
    const { error: profErr } = await admin.from("profiles").delete().eq("user_id", userId);
    if (profErr) failures.push(`profiles: ${profErr.message}`);

    // 5) The auth user itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json({ error: `Auth deletion failed: ${delErr.message}`, failures }, 500);
    }

    return json({ success: true, failures });
  } catch (e) {
    console.error("delete-account error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
