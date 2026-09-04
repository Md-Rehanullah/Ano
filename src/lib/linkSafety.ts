import { supabase } from "@/integrations/supabase/client";

export interface LinkIssue {
  url: string;
  reason: string;
  severity: "block" | "warn";
}

export interface LinkSafetyResult {
  safe: boolean;
  issues: LinkIssue[];
  urlsChecked: number;
}

const REASON_LABELS: Record<string, string> = {
  adult: "Adult content",
  malware: "Malicious / phishing",
  insecure: "Insecure (HTTP) link",
  shortener: "URL shortener (hides destination)",
  "ip-address": "Raw IP address link",
  invalid: "Invalid URL",
  unverified: "Could not be verified",
};

export const labelFor = (reason: string) => REASON_LABELS[reason] || reason;

const URL_REGEX = /\bhttps?:\/\/[^\s<>"')]+/gi;

export const extractUrls = (text: string): string[] =>
  [...new Set(text.match(URL_REGEX) || [])];

const CHECK_TIMEOUT_MS = 12000;

/**
 * Fail-closed link safety check: if the check errors, times out, or returns an
 * unusable result, every URL in the text is rejected rather than allowed.
 */
export const checkLinkSafety = async (text: string): Promise<LinkSafetyResult> => {
  const urls = extractUrls(text);
  if (urls.length === 0) return { safe: true, issues: [], urlsChecked: 0 };

  const unverified = (): LinkSafetyResult => ({
    safe: false,
    urlsChecked: urls.length,
    issues: urls.map((url) => ({ url, reason: "unverified", severity: "block" as const })),
  });

  try {
    const result = await Promise.race([
      supabase.functions.invoke("check-link-safety", { body: { text } }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("link safety check timed out")), CHECK_TIMEOUT_MS)
      ),
    ]);

    const { data, error } = result as { data: unknown; error: unknown };
    if (error) {
      console.error("Link safety check failed", error);
      return unverified();
    }

    const parsed = data as Partial<LinkSafetyResult> | null;
    if (!parsed || typeof parsed.safe !== "boolean" || !Array.isArray(parsed.issues)) {
      console.error("Link safety check returned an unusable response", data);
      return unverified();
    }

    // Every URL must have been examined; otherwise treat as unverified.
    if (typeof parsed.urlsChecked === "number" && parsed.urlsChecked < urls.length) {
      console.error("Link safety check did not cover every URL", parsed);
      return unverified();
    }

    return {
      safe: parsed.safe,
      issues: parsed.issues as LinkIssue[],
      urlsChecked: parsed.urlsChecked ?? urls.length,
    };
  } catch (e) {
    console.error("Link safety check threw", e);
    return unverified();
  }
};
