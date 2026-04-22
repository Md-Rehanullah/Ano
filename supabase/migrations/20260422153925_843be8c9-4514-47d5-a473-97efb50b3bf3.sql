-- 1) Nested replies on answers
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.answers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_answers_parent_id ON public.answers(parent_id);

-- 2) Post moderation flags + edit tracking
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_posts_pinned ON public.posts(is_pinned) WHERE is_pinned = true;

-- 3) User bans
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  banned_by UUID NOT NULL,
  reason TEXT NOT NULL,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bans"
  ON public.user_bans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see if they are banned"
  ON public.user_bans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) User warnings
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  issued_by UUID NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON public.user_warnings(user_id);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage warnings"
  ON public.user_warnings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see own warnings"
  ON public.user_warnings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge own warnings"
  ON public.user_warnings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) Moderation audit log
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'hide_post','unhide_post','pin_post','unpin_post','delete_post','delete_comment','ban_user','unban_user','warn_user','resolve_report'
  target_type TEXT,     -- 'post','comment','user','report'
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_log_actor ON public.moderation_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_target ON public.moderation_log(target_id);

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read moderation log"
  ON public.moderation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write moderation log"
  ON public.moderation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = actor_id);

-- 6) Helper: is the user currently banned?
CREATE OR REPLACE FUNCTION public.is_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = _user_id
      AND (banned_until IS NULL OR banned_until > now())
  );
$$;

-- 7) Trigger to block posts and comments from banned users
CREATE OR REPLACE FUNCTION public.block_if_banned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND public.is_banned(NEW.user_id) THEN
    RAISE EXCEPTION 'You are currently banned and cannot post or comment.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_block_if_banned ON public.posts;
CREATE TRIGGER posts_block_if_banned
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.block_if_banned();

DROP TRIGGER IF EXISTS answers_block_if_banned ON public.answers;
CREATE TRIGGER answers_block_if_banned
  BEFORE INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.block_if_banned();

-- 8) Update posts SELECT policy to hide hidden posts from non-admins (except author)
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (
    is_hidden = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- 9) Allow admins to update any post (for hide/pin)
DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10) Restrict edits to within 30 minutes of post creation (for non-admins)
CREATE OR REPLACE FUNCTION public.enforce_post_edit_window()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins anytime
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Only enforce if a user actually edited content fields
  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.description IS DISTINCT FROM OLD.description)
     OR (NEW.category IS DISTINCT FROM OLD.category)
     OR (NEW.image_url IS DISTINCT FROM OLD.image_url)
     OR (NEW.video_url IS DISTINCT FROM OLD.video_url) THEN

    IF OLD.created_at < (now() - INTERVAL '30 minutes') THEN
      RAISE EXCEPTION 'Posts can only be edited within 30 minutes of creation.'
        USING ERRCODE = 'check_violation';
    END IF;

    NEW.edited_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_edit_window ON public.posts;
CREATE TRIGGER posts_edit_window
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_post_edit_window();