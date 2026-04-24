/**
 * Badge milestones — earned client-side based on karma stats.
 * No DB writes required for display; awards are computed from the
 * user_karma view + answers count, so they stay accurate automatically.
 */

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  emoji: string;
  threshold: number;
  metric: "posts" | "likes" | "answers" | "karma";
}

export const BADGES: BadgeDef[] = [
  { key: "first_post", label: "First Post", description: "Published your first post", emoji: "✍️", threshold: 1, metric: "posts" },
  { key: "ten_posts", label: "Storyteller", description: "10 posts published", emoji: "📚", threshold: 10, metric: "posts" },
  { key: "fifty_posts", label: "Prolific", description: "50 posts published", emoji: "🏆", threshold: 50, metric: "posts" },
  { key: "ten_likes", label: "Liked", description: "Earned 10 likes", emoji: "👍", threshold: 10, metric: "likes" },
  { key: "hundred_likes", label: "Loved", description: "Earned 100 likes", emoji: "❤️", threshold: 100, metric: "likes" },
  { key: "first_comment", label: "Conversationalist", description: "Posted your first comment", emoji: "💬", threshold: 1, metric: "answers" },
  { key: "fifty_comments", label: "Helper", description: "50 comments posted", emoji: "🤝", threshold: 50, metric: "answers" },
  { key: "karma_100", label: "Rising Star", description: "Reached 100 karma", emoji: "⭐", threshold: 100, metric: "karma" },
  { key: "karma_500", label: "Community Hero", description: "Reached 500 karma", emoji: "🌟", threshold: 500, metric: "karma" },
];

export interface KarmaStats {
  posts: number;
  likes: number;
  answers: number;
  karma: number;
}

export const earnedBadges = (s: KarmaStats): BadgeDef[] =>
  BADGES.filter(b => s[b.metric] >= b.threshold);
