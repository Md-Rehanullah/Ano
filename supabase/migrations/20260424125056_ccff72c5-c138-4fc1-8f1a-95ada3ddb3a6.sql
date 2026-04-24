-- Fix SECURITY DEFINER views by recreating them with security_invoker
DROP VIEW IF EXISTS public.user_karma;
DROP VIEW IF EXISTS public.weekly_leaderboard;

CREATE VIEW public.user_karma WITH (security_invoker = true) AS
SELECT
  p.user_id,
  COUNT(DISTINCT p.id)::int AS posts_count,
  COALESCE(SUM(p.likes), 0)::int AS likes_received,
  COALESCE(SUM(p.views), 0)::int AS views_received,
  (
    COUNT(DISTINCT p.id) * 5
    + COALESCE(SUM(p.likes), 0) * 2
    + COALESCE((SELECT COUNT(*) FROM public.answers a WHERE a.user_id = p.user_id), 0)
  )::int AS karma
FROM public.posts p
WHERE p.user_id IS NOT NULL AND p.is_hidden = false
GROUP BY p.user_id;

GRANT SELECT ON public.user_karma TO anon, authenticated;

CREATE VIEW public.weekly_leaderboard WITH (security_invoker = true) AS
SELECT
  p.user_id,
  pr.display_name,
  pr.avatar_url,
  COUNT(DISTINCT p.id)::int AS posts_this_week,
  COALESCE(SUM(p.likes), 0)::int AS likes_this_week,
  (COUNT(DISTINCT p.id) * 5 + COALESCE(SUM(p.likes), 0) * 2)::int AS week_score
FROM public.posts p
LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
WHERE p.user_id IS NOT NULL
  AND p.is_hidden = false
  AND p.created_at >= (now() - INTERVAL '7 days')
GROUP BY p.user_id, pr.display_name, pr.avatar_url
ORDER BY week_score DESC
LIMIT 10;

GRANT SELECT ON public.weekly_leaderboard TO anon, authenticated;

-- Tighten permissive INSERT policies
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

DROP POLICY IF EXISTS "System inserts badges" ON public.user_badges;
-- Only the "Admins manage badges" policy remains; awards happen via admin or future SECURITY DEFINER RPC
