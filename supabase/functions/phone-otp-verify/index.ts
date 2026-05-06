// Verifies an OTP and signs the user in (or creates a new phone-only account).
// Returns a Supabase session that the client persists with setSession().
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidIndianPhone(p: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(p);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone, code } = await req.json();
    if (typeof phone !== "string" || !isValidIndianPhone(phone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Enter the 6-digit code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find a usable OTP
    const { data: rows } = await admin.from("phone_otps")
      .select("*").eq("phone", phone).eq("consumed", false)
      .order("created_at", { ascending: false }).limit(1);
    const otp = rows?.[0];
    if (!otp) return jsonErr("No active code. Please request a new one.", 400);
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return jsonErr("Code expired. Please request a new one.", 400);
    }
    if ((otp.attempts ?? 0) >= 5) {
      return jsonErr("Too many incorrect attempts. Request a new code.", 429);
    }

    const expected = await sha256Hex(code + phone);
    if (expected !== otp.code_hash) {
      await admin.from("phone_otps").update({ attempts: (otp.attempts ?? 0) + 1 }).eq("id", otp.id);
      return jsonErr("Incorrect code.", 400);
    }
    await admin.from("phone_otps").update({ consumed: true }).eq("id", otp.id);

    // Find or create the user by phone
    // listUsers doesn't filter by phone directly; use the rest API
    const fakeEmail = `${phone.replace(/[^0-9]/g, "")}@phone.bridge.local`;
    let userId: string | null = null;

    // Try to find existing user
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u: any) => u.phone === phone.replace(/^\+/, "") || u.phone === phone || u.email === fakeEmail);
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        phone, phone_confirm: true, email: fakeEmail, email_confirm: true,
        user_metadata: { display_name: `User ${phone.slice(-4)}` },
      });
      if (cErr || !created.user) {
        console.error("createUser error", cErr);
        return jsonErr(cErr?.message || "Failed to create account", 500);
      }
      userId = created.user.id;
    }

    // Generate a magic link and exchange the token_hash for a session
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error("generateLink error", linkErr);
      return jsonErr("Failed to issue session", 500);
    }

    const userClient = createClient(SUPABASE_URL, ANON);
    const { data: verified, error: vErr } = await userClient.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    });
    if (vErr || !verified.session) {
      console.error("verifyOtp error", vErr);
      return jsonErr("Failed to issue session", 500);
    }

    return new Response(JSON.stringify({
      session: {
        access_token: verified.session.access_token,
        refresh_token: verified.session.refresh_token,
      },
      user_id: userId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("phone-otp-verify error", e);
    return jsonErr(String(e), 500);
  }

  function jsonErr(msg: string, status: number) {
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
