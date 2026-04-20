// Edge function: scans URLs found in a post for malicious / adult / insecure content.
// Uses Google Safe Browsing v4 + a local heuristic blocklist.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADULT_DOMAINS = [
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com', 'youporn.com',
  'xhamster.com', 'spankbang.com', 'porn.com', 'brazzers.com', 'onlyfans.com',
  'chaturbate.com', 'stripchat.com', 'cam4.com', 'livejasmin.com',
];

const SHORTENERS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly'];

interface Issue {
  url: string;
  reason: string; // 'adult' | 'malware' | 'insecure' | 'shortener' | 'ip-address'
  severity: 'block' | 'warn';
}

const extractUrls = (text: string): string[] => {
  const regex = /https?:\/\/[^\s<>"')]+/gi;
  return [...new Set(text.match(regex) || [])];
};

const localCheck = (url: string): Issue | null => {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');

    // IP address URLs
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      return { url, reason: 'ip-address', severity: 'block' };
    }
    // Adult content
    if (ADULT_DOMAINS.some(d => host === d || host.endsWith('.' + d))) {
      return { url, reason: 'adult', severity: 'block' };
    }
    // Insecure (HTTP)
    if (u.protocol === 'http:') {
      return { url, reason: 'insecure', severity: 'warn' };
    }
    // URL shorteners (we can't see what's behind them)
    if (SHORTENERS.includes(host)) {
      return { url, reason: 'shortener', severity: 'warn' };
    }
    return null;
  } catch {
    return { url, reason: 'invalid', severity: 'warn' };
  }
};

const safeBrowsingCheck = async (urls: string[], apiKey: string): Promise<Issue[]> => {
  if (urls.length === 0) return [];
  try {
    const resp = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'bridge-app', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: urls.map(url => ({ url })),
          },
        }),
      }
    );
    if (!resp.ok) {
      console.warn('Safe Browsing API error', resp.status, await resp.text());
      return [];
    }
    const data = await resp.json();
    const matches = data.matches || [];
    return matches.map((m: any) => ({
      url: m.threat?.url ?? '',
      reason: 'malware',
      severity: 'block' as const,
    }));
  } catch (e) {
    console.error('Safe Browsing request failed', e);
    return [];
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const urls = extractUrls(text);
    if (urls.length === 0) {
      return new Response(JSON.stringify({ safe: true, issues: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const issues: Issue[] = [];
    for (const url of urls) {
      const local = localCheck(url);
      if (local) issues.push(local);
    }

    const apiKey = Deno.env.get('GOOGLE_SAFE_BROWSING_API_KEY');
    if (apiKey) {
      const sbIssues = await safeBrowsingCheck(urls, apiKey);
      issues.push(...sbIssues);
    }

    const blocked = issues.filter(i => i.severity === 'block');
    return new Response(
      JSON.stringify({ safe: blocked.length === 0, issues, urlsChecked: urls.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
