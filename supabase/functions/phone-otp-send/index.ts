// Sends an OTP to an Indian (+91) phone number using Twilio Verify API.
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
    const { phone } = await req.json();
    if (typeof phone !== "string" || !isValidIndianPhone(phone)) {
      return json({ error: "Enter a valid 10-digit Indian mobile number." }, 400);
    }

    const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!SID || !TOKEN || !VERIFY_SID) {
      console.error("Missing Twilio Verify config", { hasSid: !!SID, hasToken: !!TOKEN, hasVerify: !!VERIFY_SID });
      return json({ error: "Server configuration error" }, 500);
    }

    const auth = btoa(`${SID}:${TOKEN}`);
    const body = new URLSearchParams({ To: phone, Channel: "sms" });
    const resp = await fetch(`https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Twilio Verify send error", resp.status, data);
      return json({ error: data?.message || "Failed to send OTP" }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("phone-otp-send error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
