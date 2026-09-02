// Sightengine media moderation edge function (images + videos)
// Docs: https://sightengine.com/docs/getting-started
//
// Secrets required (already configured):
//   SIGHTENGINE_API_USER   — numeric API user
//   SIGHTENGINE_API_SECRET — API secret
//
// Request body:
//   { mediaUrl: string, kind?: "image" | "video" }
//   (also accepts { imageUrl } for backward compat)
//
// Returns:
//   { allowed: boolean, reasons: string[], kind: "image"|"video", raw: any }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const IMAGE_MODELS = "nudity-2.1,weapon,recreational_drug,offensive,gore,face-attributes";
// Videos are only checked for nudity and gore (extreme violence).
const VIDEO_MODELS = "nudity-2.1,gore";

type Frame = Record<string, any>;

function evaluateFrame(data: Frame, videoOnly = false): string[] {
  const reasons: string[] = [];
  const nudity = data.nudity ?? {};
  if ((nudity.sexual_activity ?? 0) > 0.5) reasons.push("sexual_activity");
  if ((nudity.sexual_display ?? 0) > 0.5) reasons.push("sexual_display");
  if ((nudity.erotica ?? 0) > 0.6) reasons.push("erotica");
  if (!videoOnly && (nudity.very_suggestive ?? 0) > 0.75) reasons.push("very_suggestive");
  if ((data.gore?.prob ?? 0) > (videoOnly ? 0.75 : 0.5)) reasons.push("gore");
  if (!videoOnly) {
    if ((data.weapon?.classes?.firearm ?? 0) > 0.5) reasons.push("weapon");
    if ((data.recreational_drug?.prob ?? 0) > 0.6) reasons.push("drugs");
    if ((data.offensive?.prob ?? 0) > 0.6) reasons.push("offensive");
  }
  const faces = data["face-attributes"]?.faces ?? [];
  const sexualScore =
    (nudity.sexual_activity ?? 0) + (nudity.sexual_display ?? 0) + (nudity.erotica ?? 0);
  for (const f of faces) {
    const minorProb = f?.attributes?.minor ?? 0;
    if (minorProb > 0.5 && sexualScore > 0.2) {
      reasons.push("possible_csam");
      break;
    }
  }
  return reasons;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ---- auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    // ---- input ----
    const body = await req.json().catch(() => ({} as any));
    const mediaUrl: string | undefined = body?.mediaUrl ?? body?.imageUrl;
    let kind: "image" | "video" = body?.kind ?? "image";
    if (!mediaUrl || typeof mediaUrl !== "string" || !/^https:\/\//i.test(mediaUrl)) {
      return json({ error: "mediaUrl (https) is required" }, 400);
    }
    if (!body?.kind && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(mediaUrl)) kind = "video";

    // ---- secrets ----
    const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
    const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
    if (!apiUser || !apiSecret) return json({ error: "Sightengine credentials not configured" }, 500);

    // ---- call sightengine ----
    if (kind === "image") {
      const params = new URLSearchParams({
        url: mediaUrl, models: IMAGE_MODELS, api_user: apiUser, api_secret: apiSecret,
      });
      const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
      const data = await res.json();
      if (data.status !== "success") return json({ error: "Sightengine error", raw: data }, 502);
      const reasons = evaluateFrame(data);
      return json({ allowed: reasons.length === 0, reasons, kind, raw: data });
    }

    // Video: synchronous frame-by-frame check. Videos fail OPEN — if Sightengine
    // is unreachable, times out, or the plan does not cover video, we allow the
    // upload instead of blocking normal footage.
    const params = new URLSearchParams({
      stream_url: mediaUrl, models: VIDEO_MODELS, api_user: apiUser, api_secret: apiSecret,
    });
    let data: any;
    try {
      const res = await fetch(`https://api.sightengine.com/1.0/video/check-sync.json?${params}`, {
        signal: AbortSignal.timeout(45_000),
      });
      data = await res.json();
    } catch (_e) {
      return json({ allowed: true, reasons: [], kind, degraded: true });
    }
    if (data?.status !== "success") {
      return json({ allowed: true, reasons: [], kind, degraded: true, raw: data });
    }

    const frames: Frame[] = data.data?.frames ?? [];
    const reasonsSet = new Set<string>();
    for (const f of frames) for (const r of evaluateFrame(f, true)) reasonsSet.add(r);
    const reasons = Array.from(reasonsSet);
    return json({ allowed: reasons.length === 0, reasons, kind, raw: data });

  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
