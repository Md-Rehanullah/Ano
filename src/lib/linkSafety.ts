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
};

export const labelFor = (reason: string) => REASON_LABELS[reason] || reason;

export const checkLinkSafety = async (text: string): Promise<LinkSafetyResult> => {
  try {
    const { data, error } = await supabase.functions.invoke("check-link-safety", {
      body: { text },
    });
    if (error) throw error;
    return data as LinkSafetyResult;
  } catch (e) {
    console.warn("link safety check failed, allowing post", e);
    return { safe: true, issues: [], urlsChecked: 0 };
  }
};
