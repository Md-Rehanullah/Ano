// Sends an OTP via Twilio SMS to an Indian (+91) phone number.
// Stores a hashed OTP in `phone_otps` with a 5-minute expiry.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidIndianPhone(p: string): boolean {
  // Expected format: +91 followed by exactly 10 digits, first digit 6-9
  return /^\+91[6-9]\d{9}$/.test(p);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (typeof phone !== "string" || !isValidIndianPhone(phone)) {
      return new Response(JSON.stringify({ error: "Enter a valid 10-digit Indian mobile number." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!TWILIO_API_KEY) return new Response(JSON.stringify({ error: "Twilio is not connected" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!TWILIO_FROM) return new Response(JSON.stringify({ error: "TWILIO_FROM_NUMBER not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Rate-limit: max 3 active codes per number in last 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin.from("phone_otps").select("id", { count: "exact", head: true })
      .eq("phone", phone).gte("created_at", tenMinAgo);
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a few minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256Hex(code + phone);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertErr } = await admin.from("phone_otps").insert({
      phone, code_hash, expires_at,
    });
    if (insertErr) throw insertErr;

    const body = new URLSearchParams({
      To: phone, From: TWILIO_FROM,
      Body: `Your Bridge verification code is ${code}. It expires in 5 minutes.`,
    });
    const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Twilio error", resp.status, data);
      return new Response(JSON.stringify({ error: data?.message || "Failed to send OTP" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("phone-otp-send error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
