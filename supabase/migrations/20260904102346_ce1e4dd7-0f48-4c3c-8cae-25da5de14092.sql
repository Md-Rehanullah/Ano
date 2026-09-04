-- 1) Private profile enforcement at RLS level
DROP POLICY IF EXISTS "Answers are viewable by everyone" ON public.answers;
CREATE POLICY "Answers are viewable by everyone"
ON public.answers FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    (user_id IS NULL OR NOT public.is_blocked_with(auth.uid(), user_id))
    AND (user_id IS NULL OR NOT public.is_profile_private(user_id))
  )
);

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
ON public.posts FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    is_hidden = false
    AND (user_id IS NULL OR NOT public.is_blocked_with(auth.uid(), user_id))
    AND (user_id IS NULL OR NOT public.is_profile_private(user_id))
  )
);

-- 2) Comment reporting
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS answer_id uuid REFERENCES public.answers(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS reports_answer_id_idx ON public.reports(answer_id);

CREATE OR REPLACE FUNCTION public.notify_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_author UUID;
  post_title TEXT;
BEGIN
  SELECT user_id, title INTO target_author, post_title
  FROM public.posts WHERE id = NEW.post_id;

  IF NEW.answer_id IS NOT NULL THEN
    SELECT user_id INTO target_author FROM public.answers WHERE id = NEW.answer_id;
    IF target_author IS NULL OR target_author = NEW.user_id THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.notifications (user_id, actor_id, type, message, link, post_id, answer_id)
    VALUES (
      target_author, NEW.user_id, 'report',
      'reported your comment — please review the community guidelines',
      '/post/' || NEW.post_id, NEW.post_id, NEW.answer_id
    );
    RETURN NEW;
  END IF;

  IF target_author IS NULL OR target_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, message, link, post_id)
  VALUES (
    target_author, NEW.user_id, 'report',
    'reported your post "' || COALESCE(post_title, '') || '" — please review the community guidelines',
    '/post/' || NEW.post_id, NEW.post_id
  );
  RETURN NEW;
END;
$function$;

-- 3) Private storage bucket policies for document attachments
DROP POLICY IF EXISTS "Users read own post files" ON storage.objects;
CREATE POLICY "Users read own post files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'post-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Users upload own post files" ON storage.objects;
CREATE POLICY "Users upload own post files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own post files" ON storage.objects;
CREATE POLICY "Users update own post files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'post-files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'post-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own post files" ON storage.objects;
CREATE POLICY "Users delete own post files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);