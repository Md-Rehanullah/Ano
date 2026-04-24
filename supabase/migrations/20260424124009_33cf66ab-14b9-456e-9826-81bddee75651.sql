-- ============ POLLS ============
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE,
  question TEXT NOT NULL,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls viewable by everyone" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Post author manages poll" ON public.polls FOR ALL
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins manage polls" ON public.polls FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll options viewable by everyone" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Poll author manages options" ON public.poll_options FOR ALL
  USING (EXISTS (SELECT 1 FROM public.polls pl JOIN public.posts p ON p.id = pl.post_id WHERE pl.id = poll_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.polls pl JOIN public.posts p ON p.id = pl.post_id WHERE pl.id = poll_id AND p.user_id = auth.uid()));

CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes viewable by everyone" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Users vote for themselves" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vote" ON public.poll_votes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_poll_options_poll ON public.poll_options(poll_id);
CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  post_id UUID,
  answer_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

-- Trigger: when an answer is created, notify the post author (if not self) and the parent answer author (if reply)
CREATE OR REPLACE FUNCTION public.notify_on_answer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  post_author UUID;
  parent_author UUID;
  post_title TEXT;
BEGIN
  SELECT user_id, title INTO post_author, post_title FROM public.posts WHERE id = NEW.post_id;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author FROM public.answers WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, message, link, post_id, answer_id)
      VALUES (parent_author, NEW.user_id, 'reply', 'replied to your comment', '/post/' || NEW.post_id, NEW.post_id, NEW.id);
    END IF;
  END IF;

  IF post_author IS NOT NULL AND post_author <> NEW.user_id AND (NEW.parent_id IS NULL OR post_author <> parent_author) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, message, link, post_id, answer_id)
    VALUES (post_author, NEW.user_id, 'comment', 'commented on "' || COALESCE(post_title, 'your post') || '"', '/post/' || NEW.post_id, NEW.post_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_answer AFTER INSERT ON public.answers
FOR EACH ROW EXECUTE FUNCTION public.notify_on_answer();

-- ============ BADGES ============
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_key TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON public.user_badges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System inserts badges" ON public.user_badges FOR INSERT WITH CHECK (true);

-- ============ KARMA VIEW ============
CREATE OR REPLACE VIEW public.user_karma AS
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

-- ============ WEEKLY LEADERBOARD VIEW ============
CREATE OR REPLACE VIEW public.weekly_leaderboard AS
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
