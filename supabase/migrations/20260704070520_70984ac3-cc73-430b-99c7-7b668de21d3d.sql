
-- ============ 1. CONTENT VALIDATION (DB-level constraints) ============
ALTER TABLE public.posts
  ADD CONSTRAINT posts_title_length CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 300),
  ADD CONSTRAINT posts_desc_length CHECK (description IS NULL OR char_length(description) <= 10000),
  ADD CONSTRAINT posts_category_valid CHECK (category IN ('General','Technology','Education','Lifestyle','Other')),
  ADD CONSTRAINT posts_image_url_len CHECK (image_url IS NULL OR char_length(image_url) <= 2048),
  ADD CONSTRAINT posts_video_url_len CHECK (video_url IS NULL OR char_length(video_url) <= 2048);

ALTER TABLE public.answers
  ADD CONSTRAINT answers_content_length CHECK (char_length(content) BETWEEN 1 AND 5000),
  ADD CONSTRAINT answers_image_url_len CHECK (image_url IS NULL OR char_length(image_url) <= 2048);

ALTER TABLE public.contact_messages
  ADD CONSTRAINT cm_name_len CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT cm_email_len CHECK (char_length(email) BETWEEN 3 AND 255),
  ADD CONSTRAINT cm_subject_len CHECK (char_length(subject) BETWEEN 1 AND 200),
  ADD CONSTRAINT cm_message_len CHECK (char_length(message) BETWEEN 1 AND 2000);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reason_len CHECK (char_length(reason) BETWEEN 1 AND 1000);

-- ============ 2. TIGHTEN RLS POLICIES ============

-- liked_posts: SELECT was USING(true) — restrict to owner
DROP POLICY IF EXISTS "Liked posts viewable by everyone" ON public.liked_posts;
CREATE POLICY "Users view own liked posts"
  ON public.liked_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- poll_votes: SELECT was USING(true) — restrict to owner; aggregates via SECURITY DEFINER function
DROP POLICY IF EXISTS "Votes viewable by everyone" ON public.poll_votes;
CREATE POLICY "Users view own poll votes"
  ON public.poll_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Aggregate poll counts function (safe to call publicly)
CREATE OR REPLACE FUNCTION public.get_poll_tally(p_poll_id uuid)
RETURNS TABLE(option_id uuid, votes bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT option_id, count(*)::bigint AS votes
  FROM public.poll_votes
  WHERE poll_id = p_poll_id
  GROUP BY option_id
$$;

-- notifications INSERT: only the actor can insert AND recipient must be author of post/answer/parent (or self)
DROP POLICY IF EXISTS "Users insert notifications as actor" ON public.notifications;
CREATE POLICY "Actors insert notifications for legitimate recipients"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = notifications.post_id AND p.user_id = notifications.user_id)
      OR EXISTS (SELECT 1 FROM public.answers a WHERE a.id = notifications.answer_id AND a.user_id = notifications.user_id)
    )
  );

-- contact_messages INSERT: tighten WITH CHECK true (user_id must be null or self)
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ============ 3. STORAGE: post-images path scoping + no listing ============
-- Drop overly permissive INSERT policy and the SELECT-listing policies.
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
CREATE POLICY "Users upload post images to their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Remove broad SELECT policies that enable listing. Public buckets still serve object URLs directly.
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Banner images are publicly accessible" ON storage.objects;

-- ============ 4. RPC user_id spoofing: rewrite to use auth.uid() ============
DROP FUNCTION IF EXISTS public.increment_post_likes(uuid, uuid);
DROP FUNCTION IF EXISTS public.increment_post_dislikes(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_interaction(uuid, uuid);
DROP FUNCTION IF EXISTS public.increment_answer_likes(uuid, uuid);
DROP FUNCTION IF EXISTS public.increment_answer_dislikes(uuid, uuid);

CREATE OR REPLACE FUNCTION public.increment_post_likes(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  caller uuid := auth.uid();
  existing_interaction TEXT;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT interaction_type INTO existing_interaction
  FROM public.user_interactions
  WHERE user_interactions.post_id = increment_post_likes.post_id AND user_interactions.user_id = caller;

  IF existing_interaction IS NULL THEN
    INSERT INTO public.user_interactions (user_id, post_id, interaction_type) VALUES (caller, post_id, 'like');
    UPDATE public.posts SET likes = likes + 1 WHERE id = post_id;
  ELSIF existing_interaction = 'dislike' THEN
    UPDATE public.user_interactions SET interaction_type = 'like', updated_at = now()
      WHERE user_interactions.post_id = increment_post_likes.post_id AND user_interactions.user_id = caller;
    UPDATE public.posts SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = post_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_post_dislikes(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  caller uuid := auth.uid();
  existing_interaction TEXT;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT interaction_type INTO existing_interaction
  FROM public.user_interactions
  WHERE user_interactions.post_id = increment_post_dislikes.post_id AND user_interactions.user_id = caller;

  IF existing_interaction IS NULL THEN
    INSERT INTO public.user_interactions (user_id, post_id, interaction_type) VALUES (caller, post_id, 'dislike');
    UPDATE public.posts SET dislikes = dislikes + 1 WHERE id = post_id;
  ELSIF existing_interaction = 'like' THEN
    UPDATE public.user_interactions SET interaction_type = 'dislike', updated_at = now()
      WHERE user_interactions.post_id = increment_post_dislikes.post_id AND user_interactions.user_id = caller;
    UPDATE public.posts SET dislikes = dislikes + 1, likes = likes - 1 WHERE id = post_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_interaction(post_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT interaction_type FROM public.user_interactions
  WHERE user_interactions.post_id = get_user_interaction.post_id
    AND user_interactions.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.increment_answer_likes(answer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  caller uuid := auth.uid();
  existing_interaction TEXT;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT interaction_type INTO existing_interaction
  FROM public.answer_interactions
  WHERE answer_interactions.answer_id = increment_answer_likes.answer_id AND answer_interactions.user_id = caller;

  IF existing_interaction IS NULL THEN
    INSERT INTO public.answer_interactions (user_id, answer_id, interaction_type) VALUES (caller, answer_id, 'like');
    UPDATE public.answers SET likes = likes + 1 WHERE id = answer_id;
  ELSIF existing_interaction = 'dislike' THEN
    UPDATE public.answer_interactions SET interaction_type = 'like', updated_at = now()
      WHERE answer_interactions.answer_id = increment_answer_likes.answer_id AND answer_interactions.user_id = caller;
    UPDATE public.answers SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = answer_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_answer_dislikes(answer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  caller uuid := auth.uid();
  existing_interaction TEXT;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT interaction_type INTO existing_interaction
  FROM public.answer_interactions
  WHERE answer_interactions.answer_id = increment_answer_dislikes.answer_id AND answer_interactions.user_id = caller;

  IF existing_interaction IS NULL THEN
    INSERT INTO public.answer_interactions (user_id, answer_id, interaction_type) VALUES (caller, answer_id, 'dislike');
    UPDATE public.answers SET dislikes = dislikes + 1 WHERE id = answer_id;
  ELSIF existing_interaction = 'like' THEN
    UPDATE public.answer_interactions SET interaction_type = 'dislike', updated_at = now()
      WHERE answer_interactions.answer_id = increment_answer_dislikes.answer_id AND answer_interactions.user_id = caller;
    UPDATE public.answers SET dislikes = dislikes + 1, likes = likes - 1 WHERE id = answer_id;
  END IF;
END; $$;

-- ============ 5. SECURITY DEFINER function EXECUTE hardening ============
-- Revoke EXECUTE on internal helpers from anon/authenticated (used only by RLS/triggers).
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_blocked_with(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_profile_private(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_profile_access_state(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_if_banned() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_post_edit_window() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_answer() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_post_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_liked_posts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Client-callable RPCs: require authentication (revoke anon, keep authenticated)
REVOKE ALL ON FUNCTION public.increment_post_likes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_post_likes(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_post_dislikes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_post_dislikes(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_user_interaction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_interaction(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_answer_likes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_answer_likes(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_answer_dislikes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_answer_dislikes(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_post_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_personalized_feed(uuid, uuid[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, uuid[], integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_poll_tally(uuid) TO anon, authenticated;
