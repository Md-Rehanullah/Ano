// Lightweight localStorage cache for the homepage feed.
// Lets users see the most-recent feed when offline (read-only).

const KEY = "bridge:feed:v1";
const STAMP_KEY = "bridge:feed:stamp:v1";
const MAX_BYTES = 1_500_000; // ~1.5 MB safety cap

export interface CachedPost {
  id: string;
  title: string;
  description: string;
  category: string;
  likes: number;
  dislikes: number;
  views: number;
  imageUrl?: string;
  videoUrl?: string;
  created_at: string;
  edited_at?: string | null;
  is_pinned?: boolean;
  authorName?: string | null;
  authorAvatar?: string | null;
  authorUserId?: string | null;
  isSeed?: boolean;
  answers: Array<{
    id: string;
    content: string;
    likes: number;
    dislikes: number;
    parent_id?: string | null;
    created_at: string;
    authorName?: string | null;
    authorAvatar?: string | null;
  }>;
}

export const saveFeedCache = (posts: CachedPost[]) => {
  try {
    const json = JSON.stringify(posts);
    if (json.length > MAX_BYTES) {
      // Trim to most recent 30 posts if too big
      const trimmed = JSON.stringify(posts.slice(0, 30));
      localStorage.setItem(KEY, trimmed);
    } else {
      localStorage.setItem(KEY, json);
    }
    localStorage.setItem(STAMP_KEY, String(Date.now()));
  } catch (e) {
    // Quota exceeded — silently drop the cache
    try { localStorage.removeItem(KEY); } catch {}
  }
};

export const loadFeedCache = (): { posts: CachedPost[]; cachedAt: number } | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const stamp = Number(localStorage.getItem(STAMP_KEY) || 0);
    return { posts: JSON.parse(raw) as CachedPost[], cachedAt: stamp };
  } catch {
    return null;
  }
};

export const clearFeedCache = () => {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(STAMP_KEY);
  } catch {}
};

export const isOnline = () => typeof navigator !== "undefined" ? navigator.onLine : true;
