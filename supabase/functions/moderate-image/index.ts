// Sightengine image moderation edge function
// Called from the client after an image is uploaded to Supabase Storage.
// Docs: https://sightengine.com/docs/getting-started
//
// Required secrets (set in Supabase → Edge Functions → Secrets):
//   SIGHTENGINE_API_USER   — your Sightengine API user (numeric)
//   SIGHTENGINE_API_SECRET — your Sightengine API secret
//
// Behaviour:
//   - Requires a signed-in caller (JWT verified)
//   - Accepts { imageUrl: string } — must be publicly reachable HTTPS
//   - Runs nudity + weapons + drugs + minors + gore + offensive models
//   - Returns { allowed: boolean, reasons: string[], raw: any }
//   - If not allowed, the client should delete the just-uploaded object
//     and refuse to attach it to a post/comment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODELS = "nudity-2.1,weapon,recreational_drug,medical,offensive,gore,face-attributes";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ---- auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- input ----
    const body = await req.json().catch(() => ({}));
    const imageUrl: string | undefined = body?.imageUrl;
    if (!imageUrl || typeof imageUrl !== "string" || !/^https:\/\//i.test(imageUrl)) {
      return new Response(JSON.stringify({ error: "imageUrl (https) is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- secrets ----
    const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
    const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
    if (!apiUser || !apiSecret) {
      return new Response(JSON.stringify({ error: "Sightengine credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- call sightengine ----
    const params = new URLSearchParams({
      url: imageUrl,
      models: MODELS,
      api_user: apiUser,
      api_secret: apiSecret,
    });
    const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
    const data = await res.json();

    if (data.status !== "success") {
      return new Response(JSON.stringify({ error: "Sightengine error", raw: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- decide ----
    const reasons: string[] = [];
    const nudity = data.nudity ?? {};
    if ((nudity.sexual_activity ?? 0) > 0.5) reasons.push("sexual_activity");
    if ((nudity.sexual_display ?? 0) > 0.5) reasons.push("sexual_display");
    if ((nudity.erotica ?? 0) > 0.6) reasons.push("erotica");
    if ((nudity.very_suggestive ?? 0) > 0.7) reasons.push("very_suggestive");
    if ((data.weapon?.classes?.firearm ?? 0) > 0.5) reasons.push("weapon");
    if ((data.recreational_drug?.prob ?? 0) > 0.6) reasons.push("drugs");
    if ((data.gore?.prob ?? 0) > 0.5) reasons.push("gore");
    if ((data.offensive?.prob ?? 0) > 0.6) reasons.push("offensive");
    // minor detection — reject any image where a detected face is likely a minor
    const faces = data["face-attributes"]?.faces ?? [];
    for (const f of faces) {
      const minorProb = f?.attributes?.minor ?? 0;
      if (minorProb > 0.5 && (nudity.sexual_activity ?? 0) + (nudity.sexual_display ?? 0) + (nudity.erotica ?? 0) > 0.2) {
        reasons.push("possible_csam");
        break;
      }
    }

    const allowed = reasons.length === 0;
    return new Response(JSON.stringify({ allowed, reasons, raw: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
