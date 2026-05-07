// Verifies an OTP via Twilio Verify and signs the user in (or creates a new phone-only account).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidIndianPhone(p: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(p);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone, code } = await req.json();
    if (typeof phone !== "string" || !isValidIndianPhone(phone)) return json({ error: "Invalid phone number." }, 400);
    if (typeof code !== "string" || !/^\d{4,8}$/.test(code)) return json({ error: "Enter the verification code." }, 400);

    const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!SID || !TOKEN || !VERIFY_SID) return json({ error: "Server configuration error" }, 500);

    // Verify OTP with Twilio
    const auth = btoa(`${SID}:${TOKEN}`);
    const body = new URLSearchParams({ To: phone, Code: code });
    const resp = await fetch(`https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Twilio Verify check error", resp.status, data);
      return json({ error: data?.message || "Verification failed" }, 400);
    }
    if (data.status !== "approved") {
      return json({ error: "Incorrect or expired code." }, 400);
    }

    // Find or create the user
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const fakeEmail = `${phone.replace(/[^0-9]/g, "")}@phone.bridge.local`;

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u: any) =>
      u.phone === phone.replace(/^\+/, "") || u.phone === phone || u.email === fakeEmail
    );

    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        phone, phone_confirm: true, email: fakeEmail, email_confirm: true,
        user_metadata: { display_name: `User ${phone.slice(-4)}` },
      });
      if (cErr || !created.user) {
        console.error("createUser error", cErr);
        return json({ error: cErr?.message || "Failed to create account" }, 500);
      }
      userId = created.user.id;
    }

    // Issue a session via magiclink exchange
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink", email: fakeEmail,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error("generateLink error", linkErr);
      return json({ error: "Failed to issue session" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, ANON);
    const { data: verified, error: vErr } = await userClient.auth.verifyOtp({
      type: "magiclink", token_hash: link.properties.hashed_token,
    });
    if (vErr || !verified.session) {
      console.error("verifyOtp error", vErr);
      return json({ error: "Failed to issue session" }, 500);
    }

    return json({
      session: {
        access_token: verified.session.access_token,
        refresh_token: verified.session.refresh_token,
      },
      user_id: userId,
    });
  } catch (e) {
    console.error("phone-otp-verify error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
