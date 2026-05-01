// Basic client-side profanity / adult-content filter.
// This is intentionally a denylist — server-side AI moderation handles edge cases.
// Keep this list focused on universally objectionable terms.
const BLOCKED_PATTERNS: RegExp[] = [
  // Strong profanity (English)
  /\bf+u+c+k+\w*/i,
  /\bsh+i+t+\w*/i,
  /\bb+i+t+c+h+\w*/i,
  /\ba+s+s+h+o+l+e+\w*/i,
  /\bc+u+n+t+\w*/i,
  /\bd+i+c+k+h+e+a+d+\w*/i,
  /\bm+o+t+h+e+r+f+u+c+k+\w*/i,
  // Slurs (do not enumerate; broad catch via these patterns)
  /\bn+i+g+g+\w*/i,
  /\bf+a+g+g?\w*/i,
  /\br+e+t+a+r+d+\w*/i,
  // Adult / sexual
  /\bp+o+r+n+\w*/i,
  /\bx+x+x+\b/i,
  /\bn+u+d+e+s?\b/i,
  /\bs+e+x+t+\w*/i,
  /\bb+l+o+w+j+o+b+\w*/i,
  /\bh+a+n+d+j+o+b+\w*/i,
  /\bc+u+m+s+h+o+t+\w*/i,
  /\bonlyfans\b/i,
  // Hindi (Roman script) common abuses
  /\bm+a+d+a+r+c+h+o+d+\w*/i,
  /\bb+h+e+n+c+h+o+d+\w*/i,
  /\bc+h+u+t+i+y+a+\w*/i,
  /\brandi\w*/i,
  /\bgaa?nd\w*/i,
  /\blawda\w*/i,
  /\blund\w*/i,
];

export interface ProfanityResult {
  ok: boolean;
  match?: string;
}

export function checkProfanity(text: string): ProfanityResult {
  if (!text) return { ok: true };
  for (const re of BLOCKED_PATTERNS) {
    const m = text.match(re);
    if (m) return { ok: false, match: m[0] };
  }
  return { ok: true };
}
