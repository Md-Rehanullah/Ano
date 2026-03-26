
-- Bookmarks table
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);

-- Views column on posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

-- Video URL column on posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url text;

-- First time guide tracking
CREATE TABLE public.user_guide_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  seen_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_guide_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own guide status" ON public.user_guide_seen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark guide seen" ON public.user_guide_seen FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to increment post views
CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET views = views + 1 WHERE id = p_post_id;
END;
$$;
