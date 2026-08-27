// Feed session management.
// A "feed session" pins one deterministic ranking seed so the order stays stable
// while the user browses, and changes only when the app is (re)opened or refreshed.

const SEED_KEY = "bridge:feed-seed";

const newSeed = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

/** Seed for the current browsing session (created once per app open). */
export const getFeedSeed = (): string => {
  try {
    const existing = sessionStorage.getItem(SEED_KEY);
    if (existing) return existing;
    const seed = newSeed();
    sessionStorage.setItem(SEED_KEY, seed);
    return seed;
  } catch {
    return newSeed();
  }
};

/** Start a new feed session (explicit refresh / pull-to-refresh). */
export const rotateFeedSeed = (): string => {
  const seed = newSeed();
  try {
    sessionStorage.setItem(SEED_KEY, seed);
  } catch {
    /* ignore */
  }
  return seed;
};

export const FEED_PAGE_SIZE = 15;
