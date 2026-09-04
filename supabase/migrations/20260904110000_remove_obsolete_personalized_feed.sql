-- Harden the current personalized-feed RPC against user-ID spoofing.
--
-- The frontend supplies the authenticated user's ID as p_user_id.
-- The function must verify that ID against auth.uid() before using it
-- for personalization data.

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid DEFAULT NULL::uuid,
  p_seed text DEFAULT NULL::text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_candidate_pool integer DEFAULT 400
)
RETURNS SETOF posts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seed text := COALESCE(
    NULLIF(p_seed, ''),
    to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MI')
  );
  effective_user_id uuid := auth.uid();
BEGIN
  -- Never allow a caller to personalize the feed using another
  -- user's UUID.
  IF effective_user_id IS NULL THEN
    p_user_id := NULL;
  ELSE
    p_user_id := effective_user_id;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT p.*
    FROM public.posts p
    WHERE p.is_hidden = false
      AND NOT public.is_blocked_with(p_user_id, p.user_id)
    ORDER BY p.created_at DESC
    LIMIT GREATEST(p_candidate_pool, p_limit + p_offset)
  ),

  declared AS (
    SELECT
      ui.category,
      LEAST(1.0, GREATEST(0.0, ui.weight))::numeric AS w
    FROM public.user_interests ui
    WHERE p_user_id IS NOT NULL
      AND ui.user_id = p_user_id
  ),

  behaviour_raw AS (
    SELECT
      p.category,
      SUM(s.wt) AS score
    FROM (
      SELECT
        lp.post_id,
        3.0::numeric AS wt
      FROM public.liked_posts lp
      WHERE p_user_id IS NOT NULL
        AND lp.user_id = p_user_id
        AND lp.created_at > now() - interval '90 days'

      UNION ALL

      SELECT
        a.post_id,
        4.0::numeric
      FROM public.answers a
      WHERE p_user_id IS NOT NULL
        AND a.user_id = p_user_id
        AND a.created_at > now() - interval '90 days'

      UNION ALL

      SELECT
        b.post_id,
        2.0::numeric
      FROM public.bookmarks b
      WHERE p_user_id IS NOT NULL
        AND b.user_id = p_user_id
        AND b.created_at > now() - interval '90 days'
    ) s
    JOIN public.posts p ON p.id = s.post_id
    GROUP BY p.category
  ),

  behaviour AS (
    SELECT
      category,
      (
        score /
        NULLIF((SELECT MAX(score) FROM behaviour_raw), 0)
      )::numeric AS w
    FROM behaviour_raw
  ),

  impressions AS (
    SELECT
      fi.post_id,
      fi.shown_count,
      fi.last_shown_at
    FROM public.feed_impressions fi
    WHERE p_user_id IS NOT NULL
      AND fi.user_id = p_user_id
      AND fi.last_shown_at > now() - interval '7 days'
  ),

  scored AS (
    SELECT
      c.*,
      (
        0.40 * COALESCE(
          (
            SELECT d.w
            FROM declared d
            WHERE d.category = c.category
          ),
          0
        )

        + 0.15 * COALESCE(
          (
            SELECT b.w
            FROM behaviour b
            WHERE b.category = c.category
          ),
          0
        )

        + 0.20 * exp(
          -1 * EXTRACT(
            EPOCH FROM (now() - c.created_at)
          ) / 432000.0
        )

        + 0.10 * LEAST(
          1.0,
          ln(
            1
            + GREATEST(c.likes, 0) * 3
            + GREATEST(c.views, 0) * 0.2
            + (
              SELECT COUNT(*)
              FROM public.answers an
              WHERE an.post_id = c.id
            ) * 4
          ) / ln(200)
        )

        + 0.05 * (
          (
            'x' ||
            substr(
              md5(c.id::text || seed),
              1,
              8
            )
          )::bit(32)::bigint % 1000
        ) / 1000.0

        - COALESCE(
          (
            SELECT
              LEAST(0.30, 0.12 * i.shown_count)
              * exp(
                -1 * EXTRACT(
                  EPOCH FROM (now() - i.last_shown_at)
                ) / 259200.0
              )
            FROM impressions i
            WHERE i.post_id = c.id
          ),
          0
        )
      )::numeric AS base_score
    FROM candidates c
  ),

  diversified AS (
    SELECT
      s.*,
      s.base_score
      - 0.06 * LEAST(
          6,
          (
            ROW_NUMBER() OVER (
              PARTITION BY s.category
              ORDER BY s.base_score DESC
            ) - 1
          )
        ) AS final_score
    FROM scored s
  )

  SELECT
    d.id,
    d.user_id,
    d.title,
    d.description,
    d.category,
    d.image_url,
    d.likes,
    d.dislikes,
    d.created_at,
    d.updated_at,
    d.views,
    d.video_url,
    d.is_seed,
    d.seed_author_name,
    d.is_hidden,
    d.is_pinned,
    d.edited_at,
    d.file_url,
    d.file_name
  FROM diversified d
  ORDER BY
    d.is_pinned DESC,
    d.final_score DESC,
    d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

REVOKE ALL
ON FUNCTION public.get_personalized_feed(uuid, text, integer, integer, integer)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_personalized_feed(uuid, text, integer, integer, integer)
TO anon, authenticated, service_role;
