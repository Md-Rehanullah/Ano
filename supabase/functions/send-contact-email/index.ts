// Sends contact-form submissions to the support inbox via Resend.
// Secret required: RESEND_API_KEY
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPPORT_INBOX = "atlasthoughthelp@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({} as any));
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!name || name.length > 100) return json({ error: "Invalid name" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
      return json({ error: "Invalid email" }, 400);
    if (!subject || subject.length > 200) return json({ error: "Invalid subject" }, 400);
    if (!message || message.length > 5000) return json({ error: "Invalid message" }, 400);

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "Email service not configured" }, 500);

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bridge Contact <onboarding@resend.dev>",
        to: [SUPPORT_INBOX],
        reply_to: email,
        subject: `[Bridge Contact] ${subject}`,
        html: `
          <h2>New contact message</h2>
          <p><strong>Name:</strong> ${esc(name)}</p>
          <p><strong>Email:</strong> ${esc(email)}</p>
          <p><strong>Subject:</strong> ${esc(subject)}</p>
          <hr />
          <p style="white-space:pre-wrap">${esc(message)}</p>
        `,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "Failed to send email", raw: data }, 502);
    return json({ ok: true, id: data?.id ?? null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
