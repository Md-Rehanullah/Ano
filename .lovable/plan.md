This is a large set of changes. To keep it reviewable and avoid breaking things, I'll ship in 4 batches. Each batch is independently testable. Confirm and I'll execute Batch 1 immediately, then proceed through the rest.

---

## Batch 1 — Play Store core (Step A) + quick UI wins (#3, #4, #6)

**Play Store Step A — Legal & account deletion**
- Rewrite `src/pages/PrivacyPolicy.tsx`: fix company name (Rehan and Company), add Phone OTP / Twilio / Google OAuth / CSAM standard / data-retention sections.
- New `src/pages/Terms.tsx` route `/terms` (UGC terms, acceptable use, account termination).
- Add "Delete my account" button in `ProfileSettings.tsx` (calls existing `delete-account` edge function with confirm dialog).
- Link `/privacy` and `/terms` from the sidebar.

**#3 — Like → Heart**
- In `PostCard.tsx` swap `ThumbsUp` for `Heart` icon. When liked: filled, `text-red-500 fill-red-500`. Trigger `navigator.vibrate(15)` on like.
- Format view counts: `1200 → 1.2k`, `15000 → 15k` (helper in `src/lib/utils.ts`).

**#4 — Correct comment count**
- Currently shows total `answers.length` including replies. Change collapsed-state label to count only top-level comments (`parent_id === null`), matching what's actually visible. Same fix in `PostCard` and `PostDetail`.

**#6 — Remove refresh toast + splash**
- Remove the "Feed refreshed" toast in `PullToRefresh.tsx` / Homepage refresh handler.
- `capacitor.config.ts`: remove the `SplashScreen` plugin block entirely. Delete any splash assets under `android/app/src/main/res/drawable*/splash*` references in code (user will need to `npx cap sync` after pulling).

---

## Batch 2 — Auth simplification (#1) + Post composer (#2)

**#1 — Email-only auth, in-app**
- `src/pages/Auth.tsx`: remove Google, GitHub, and Phone OTP UI. Keep only email + password with two tabs: **Sign In** / **Sign Up**. Both flows complete inside the app (no email confirmation redirect dance — keep `emailRedirectTo` only for password reset).
- Keep `/reset-password` route (required by Supabase recovery link).
- Remove `phone-otp-send` / `phone-otp-verify` edge functions and `phone_otps` table (migration).

**#2 — Simplified post composer**
- `CreatePostForm.tsx`: remove Title and Description fields. Single `content` textarea (markdown supported). Category dropdown stays.
- DB migration: make `posts.title` nullable; treat first ~80 chars of content as derived title for cards/links. Update `PostCard`, `PostDetail`, `AllPosts` to render `content` directly with no title heading.

---

## Batch 3 — Feed algorithm (#5) + Privacy/Block (#8) + Step B (Block user)

**#5 — Personalized + rotating feed**
- New RPC `get_personalized_feed(user_id, seen_ids[])`:
  - 70% from categories the user has interacted with most (likes + views in last 30d).
  - 20% from categories they've never engaged with (discovery).
  - 10% trending overall.
  - Exclude `seen_ids` (passed from client localStorage, capped at last 100 post ids).
  - On reopen with no new posts: shuffle order using a daily seed so the same post isn't pinned at top.
- Homepage uses this RPC instead of plain `order by created_at`.

**#8 + Step B — Public/Private profiles + Block user (covers Play Store UGC requirement)**
- Migration: add `profiles.is_private boolean default false`; new table `user_blocks(blocker_id, blocked_id)`.
- RLS: posts visible only if author profile is public OR viewer is the author. All queries filter out posts/comments/profiles where viewer is blocked by author or has blocked author.
- UI:
  - Toggle in `ProfileSettings.tsx`: "Private account".
  - "Block user" menu item on `PostCard` author and `UserProfile` page.
  - "Blocked users" list in settings with unblock.

---

## Batch 4 — Seed content (#7) + Step C (Play Store assets & docs)

**#7 — Refresh seed posts**
- Insert tool: delete current seed posts (`is_seed = true`), insert ~15 new engaging seeds:
  - Math puzzles (3), Python output quizzes (3), Java quizzes (2), study riddles (3), lifestyle/debate (4) — all tagged with appropriate category.

**Step C — Play Store readiness package**
- Verify `android/app/build.gradle` targetSdk = 34+ (bump if needed).
- Add adaptive icon foreground/background guidance.
- Generate `/mnt/documents/PLAY_STORE_CHECKLIST.md` containing:
  - Exact Data Safety form answers (every field).
  - Content rating questionnaire answers.
  - Store listing copy (short + long description, category = Social).
  - Screenshots checklist (sizes required).
  - App signing & internal testing track steps.

---

## Notes / risks
- Removing Title field is a schema change; existing posts keep their titles, new posts will have `title = null` and render from `content`.
- Disabling phone OTP means India users sign up via email only. Twilio keeps running but unused (you can keep secrets for later).
- Splash screen removal means Android shows a brief white flash on cold start — that's normal and Play Store accepts it.
- The personalized feed RPC is a meaningful change; I'll keep a "Latest" tab in `/all-posts` unchanged so chronological browsing still exists.

Reply **"go"** and I'll start Batch 1. Or tell me which batches to skip / reorder.
