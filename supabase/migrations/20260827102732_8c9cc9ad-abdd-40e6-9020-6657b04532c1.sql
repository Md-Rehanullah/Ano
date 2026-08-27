-- 1. User-selected interests
CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  weight numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interests TO authenticated;
GRANT ALL ON public.user_interests TO service_role;

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interests"
  ON public.user_interests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_interests_updated_at
  BEFORE UPDATE ON public.user_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Lightweight per-user feed impression history
CREATE TABLE IF NOT EXISTS public.feed_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  shown_count integer NOT NULL DEFAULT 1,
  last_shown_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS feed_impressions_user_recent_idx
  ON public.feed_impressions (user_id, last_shown_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_impressions TO authenticated;
GRANT ALL ON public.feed_impressions TO service_role;

ALTER TABLE public.feed_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feed impressions"
  ON public.feed_impressions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Record impressions (called by the client after a feed page renders)
CREATE OR REPLACE FUNCTION public.record_feed_impressions(p_post_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR p_post_ids IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.feed_impressions (user_id, post_id)
  SELECT caller, pid FROM unnest(p_post_ids) AS pid
  ON CONFLICT (user_id, post_id) DO UPDATE
    SET shown_count = public.feed_impressions.shown_count + 1,
        last_shown_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_feed_impressions(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_feed_impressions(uuid[]) TO authenticated;

-- 4. Ranked personalized feed
DROP FUNCTION IF EXISTS public.get_personalized_feed(uuid, uuid[], integer);

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
  seed text := COALESCE(NULLIF(p_seed, ''), to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MI'));
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT p.*
    FROM public.posts p
    WHERE p.is_hidden = false
      AND NOT public.is_blocked_with(p_user_id, p.user_id)
    ORDER BY p.created_at DESC
    LIMIT GREATEST(p_candidate_pool, p_limit + p_offset)
  ),
  -- explicit, user-declared interests (0..1)
  declared AS (
    SELECT ui.category,
           LEAST(1.0, GREATEST(0.0, ui.weight))::numeric AS w
    FROM public.user_interests ui
    WHERE p_user_id IS NOT NULL AND ui.user_id = p_user_id
  ),
  -- implicit behaviour signals: likes, comments, bookmarks (recent 90 days), normalized 0..1
  behaviour_raw AS (
    SELECT p.category, SUM(s.wt) AS score
    FROM (
      SELECT lp.post_id, 3.0::numeric AS wt
      FROM public.liked_posts lp
      WHERE p_user_id IS NOT NULL AND lp.user_id = p_user_id
        AND lp.created_at > now() - interval '90 days'
      UNION ALL
      SELECT a.post_id, 4.0::numeric
      FROM public.answers a
      WHERE p_user_id IS NOT NULL AND a.user_id = p_user_id
        AND a.created_at > now() - interval '90 days'
      UNION ALL
      SELECT b.post_id, 2.0::numeric
      FROM public.bookmarks b
      WHERE p_user_id IS NOT NULL AND b.user_id = p_user_id
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
    WHERE p_user_id IS NOT NULL AND fi.user_id = p_user_id
      AND fi.last_shown_at > now() - interval '7 days'
  ),
  scored AS (
    SELECT c.*,
      (
        -- topic relevance from declared interests (0.40)
        0.40 * COALESCE((SELECT d.w FROM declared d WHERE d.category = c.category), 0)
        -- learned behaviour relevance (0.15)
        + 0.15 * COALESCE((SELECT b.w FROM behaviour b WHERE b.category = c.category), 0)
        -- recency: exponential decay, half-life ~5 days (0.20)
        + 0.20 * exp(-1 * EXTRACT(EPOCH FROM (now() - c.created_at)) / 432000.0)
        -- engagement, log-damped (0.10)
        + 0.10 * LEAST(1.0, ln(1 + GREATEST(c.likes, 0) * 3 + GREATEST(c.views, 0) * 0.2
                 + (SELECT COUNT(*) FROM public.answers an WHERE an.post_id = c.id) * 4) / ln(200))
        -- controlled randomness, deterministic per (post, seed) (0.05)
        + 0.05 * (('x' || substr(md5(c.id::text || seed), 1, 8))::bit(32)::bigint % 1000) / 1000.0
        -- penalty for posts shown very recently (decays back over ~3 days)
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
      -- diversity penalty: each additional post of the same category loses ground
      s.base_score - 0.06 * LEAST(6, (
        ROW_NUMBER() OVER (PARTITION BY s.category ORDER BY s.base_score DESC) - 1
      )) AS final_score
    FROM scored s
  )
  SELECT d.id, d.user_id, d.title, d.description, d.category, d.image_url, d.likes,
         d.dislikes, d.created_at, d.updated_at, d.views, d.video_url, d.is_seed,
         d.seed_author_name, d.is_hidden, d.is_pinned, d.edited_at
  FROM diversified d
  ORDER BY d.is_pinned DESC, d.final_score DESC, d.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_personalized_feed(uuid, text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, text, integer, integer, integer) TO anon, authenticated, service_role;