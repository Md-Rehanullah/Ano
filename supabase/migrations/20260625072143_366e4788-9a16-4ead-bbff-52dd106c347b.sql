-- 1) Personalized feed: drop and recreate without the is_profile_private filter
DROP FUNCTION IF EXISTS public.get_personalized_feed(uuid, uuid[], integer);

CREATE OR REPLACE FUNCTION public.get_personalized_feed(p_user_id uuid, p_seen_ids uuid[], p_limit integer DEFAULT 40)
RETURNS SETOF public.posts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, uuid[], integer) TO anon, authenticated;

-- 2) Posts visibility: keep private users' posts public; still hide between blocked users
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts
  FOR SELECT
  TO public
  USING (
    (
      is_hidden = false
      AND (user_id IS NULL OR NOT public.is_blocked_with(auth.uid(), user_id))
    )
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3) Profile details: hide for private accounts and across blocks
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable unless private or blocked"
  ON public.profiles
  FOR SELECT
  TO public
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      COALESCE(is_private, false) = false
      AND NOT public.is_blocked_with(auth.uid(), user_id)
    )
  );

-- 4) Answers: continue to hide answers between blocked users
DROP POLICY IF EXISTS "Answers are viewable by everyone" ON public.answers;
CREATE POLICY "Answers are viewable by everyone"
  ON public.answers
  FOR SELECT
  TO public
  USING (
    (user_id IS NULL OR NOT public.is_blocked_with(auth.uid(), user_id))
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 5) Helper for profile screen to decide what to show
CREATE OR REPLACE FUNCTION public.get_profile_access_state(p_profile_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_profile_user_id IS NULL THEN 'not_found'
    WHEN auth.uid() = p_profile_user_id THEN 'own'
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN 'visible'
    WHEN EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = p_profile_user_id)
         OR (ub.blocker_id = p_profile_user_id AND ub.blocked_id = auth.uid())
    ) THEN 'blocked'
    WHEN COALESCE((SELECT pr.is_private FROM public.profiles pr WHERE pr.user_id = p_profile_user_id), false) THEN 'private'
    WHEN EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.user_id = p_profile_user_id) THEN 'visible'
    ELSE 'not_found'
  END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_profile_access_state(uuid) TO anon, authenticated;