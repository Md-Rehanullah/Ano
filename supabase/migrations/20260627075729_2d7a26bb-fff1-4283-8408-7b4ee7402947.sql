
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE OR REPLACE FUNCTION public.get_personalized_feed(p_user_id uuid, p_seen_ids uuid[], p_limit integer DEFAULT 40)
 RETURNS SETOF posts
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pref_cats text[];
  daily_seed text := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24'); -- rotates hourly so feed cycles
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
    AND NOT public.is_blocked_with(p_user_id, p.user_id)
    AND (p_seen_ids IS NULL OR NOT (p.id = ANY(p_seen_ids)))
  ORDER BY
    p.is_pinned DESC,
    -- mostly preferred categories, but sprinkle in others (~25% of slots) for discovery
    (CASE
      WHEN p.category = ANY(pref_cats) THEN 0
      WHEN (('x' || substr(md5(p.id::text || daily_seed), 1, 8))::bit(32)::int % 4) = 0 THEN 1
      ELSE 2
    END),
    md5(p.id::text || daily_seed) ASC,
    p.created_at DESC
  LIMIT p_limit;
END;
$function$;
