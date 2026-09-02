-- Enforce private-account post visibility and auth-bound feed filtering.

-- 1) Posts visibility policy: private accounts' posts are hidden from everyone
-- except the owner and admins.
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts
  FOR SELECT
  TO public
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      is_hidden = false
      AND (user_id IS NULL OR NOT public.is_profile_private(user_id))
      AND (user_id IS NULL OR NOT public.is_blocked_with(auth.uid(), user_id))
    )
  );

-- 2) Personalized feed: always evaluate privacy/block checks against caller auth.
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid DEFAULT NULL,
  p_seed text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_candidate_pool integer DEFAULT 400
)
RETURNS SETOF public.posts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  viewer_id uuid := COALESCE(auth.uid(), p_user_id);
  seed text := COALESCE(NULLIF(p_seed, ''), to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MI'));
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT p.*
    FROM public.posts p
    WHERE p.is_hidden = false
      AND (p.user_id IS NULL OR NOT public.is_profile_private(p.user_id))
      AND NOT public.is_blocked_with(viewer_id, p.user_id)
    ORDER BY p.created_at DESC
    LIMIT GREATEST(p_candidate_pool, p_limit + p_offset)
  ),
  declared AS (
    SELECT ui.category,
           LEAST(1.0, GREATEST(0.0, ui.weight))::numeric AS w
    FROM public.user_interests ui
    WHERE viewer_id IS NOT NULL AND ui.user_id = viewer_id
  ),
  behaviour_raw AS (
    SELECT p.category, SUM(s.wt) AS score
    FROM (
      SELECT lp.post_id, 3.0::numeric AS wt
      FROM public.liked_posts lp
      WHERE viewer_id IS NOT NULL AND lp.user_id = viewer_id
        AND lp.created_at > now() - interval '90 days'
      UNION ALL
      SELECT a.post_id, 4.0::numeric
      FROM public.answers a
      WHERE viewer_id IS NOT NULL AND a.user_id = viewer_id
        AND a.created_at > now() - interval '90 days'
      UNION ALL
      SELECT b.post_id, 2.0::numeric
      FROM public.bookmarks b
      WHERE viewer_id IS NOT NULL AND b.user_id = viewer_id
        AND b.created_at > now() - interval '90 days'
    ) s
    JOIN public.posts p ON p.id = s.post_id
    GROUP BY p.category
  ),
  behaviour AS (
    SELECT category, (score / NULLIF((SELECT MAX(score) FROM behaviour_raw), 0))::numeric AS w
    FROM behaviour_raw
  ),
  impressions AS (
    SELECT fi.post_id, fi.shown_count, fi.last_shown_at
    FROM public.feed_impressions fi
    WHERE viewer_id IS NOT NULL AND fi.user_id = viewer_id
      AND fi.last_shown_at > now() - interval '7 days'
  ),
  scored AS (
    SELECT c.*,
      (
        0.40 * COALESCE((SELECT d.w FROM declared d WHERE d.category = c.category), 0)
        + 0.15 * COALESCE((SELECT b.w FROM behaviour b WHERE b.category = c.category), 0)
        + 0.20 * exp(-1 * EXTRACT(EPOCH FROM (now() - c.created_at)) / 432000.0)
        + 0.10 * LEAST(1.0, ln(1 + GREATEST(c.likes, 0) * 3 + GREATEST(c.views, 0) * 0.2
                 + (SELECT COUNT(*) FROM public.answers an WHERE an.post_id = c.id) * 4) / ln(200))
        + 0.05 * (('x' || substr(md5(c.id::text || seed), 1, 8))::bit(32)::bigint % 1000) / 1000.0
        - COALESCE((
            SELECT LEAST(0.30, 0.12 * i.shown_count)
                   * exp(-1 * EXTRACT(EPOCH FROM (now() - i.last_shown_at)) / 259200.0)
            FROM impressions i WHERE i.post_id = c.id
          ), 0)
      )::numeric AS base_score
    FROM candidates c
  ),
  diversified AS (
    SELECT s.*,
      s.base_score - 0.06 * LEAST(6, (
        ROW_NUMBER() OVER (PARTITION BY s.category ORDER BY s.base_score DESC) - 1
      )) AS final_score
    FROM scored s
  )
  SELECT d.id, d.user_id, d.title, d.description, d.category, d.image_url, d.likes,
         d.dislikes, d.created_at, d.updated_at, d.views, d.video_url, d.is_seed,
         d.seed_author_name, d.is_hidden, d.is_pinned, d.edited_at, d.file_url, d.file_name
  FROM diversified d
  ORDER BY d.is_pinned DESC, d.final_score DESC, d.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
