
-- 1) Composer simplification: title + description optional
ALTER TABLE public.posts ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN description DROP NOT NULL;

-- 2) Privacy toggle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 3) Block table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users create their own blocks"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users remove their own blocks"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- 4) Bidirectional block helper
CREATE OR REPLACE FUNCTION public.is_blocked_with(_viewer uuid, _other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _viewer IS NOT NULL AND _other IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _viewer AND blocked_id = _other)
       OR (blocker_id = _other  AND blocked_id = _viewer)
  );
$$;

-- 5) Private profile helper
CREATE OR REPLACE FUNCTION public.is_profile_private(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_private FROM public.profiles WHERE user_id = _uid), false);
$$;

-- 6) Tighten post / answer visibility
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (
    (is_hidden = false
      AND (user_id IS NULL OR NOT public.is_profile_private(user_id))
      AND NOT public.is_blocked_with(auth.uid(), user_id))
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Answers are viewable by everyone" ON public.answers;
CREATE POLICY "Answers are viewable by everyone"
  ON public.answers FOR SELECT
  USING (
    NOT public.is_blocked_with(auth.uid(), user_id)
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 7) Drop the obsolete phone_otps table (Twilio Verify replaces it)
DROP TABLE IF EXISTS public.phone_otps;

-- 8) Personalised feed RPC
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid,
  p_seen_ids uuid[],
  p_limit int DEFAULT 40
)
RETURNS SETOF public.posts
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pref_cats text[];
  daily_seed text := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
BEGIN
  IF p_user_id IS NULL THEN
    pref_cats := ARRAY[]::text[];
  ELSE
    SELECT COALESCE(array_agg(category ORDER BY c DESC), ARRAY[]::text[])
      INTO pref_cats
    FROM (
      SELECT p.category, COUNT(*) AS c
      FROM public.liked_posts lp
      JOIN public.posts p ON p.id = lp.post_id
      WHERE lp.user_id = p_user_id
      GROUP BY p.category
      ORDER BY c DESC
      LIMIT 3
    ) t;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.posts p
  WHERE p.is_hidden = false
    AND (p.user_id IS NULL OR NOT public.is_profile_private(p.user_id))
    AND NOT public.is_blocked_with(p_user_id, p.user_id)
    AND (p.created_at >= now() - INTERVAL '10 days' OR p.is_seed = true)
    AND (p_seen_ids IS NULL OR NOT (p.id = ANY(p_seen_ids)))
  ORDER BY
    p.is_pinned DESC,
    (CASE WHEN p.category = ANY(pref_cats) THEN 0 ELSE 1 END),
    md5(p.id::text || daily_seed) ASC,
    p.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, uuid[], int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_with(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_private(uuid) TO anon, authenticated;
