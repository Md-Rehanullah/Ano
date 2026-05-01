-- Trigger to create a notification when a user likes a post
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
  post_title TEXT;
BEGIN
  -- Only notify on transition into 'like'
  IF NEW.interaction_type <> 'like' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.interaction_type = 'like' THEN
    RETURN NEW;
  END IF;

  SELECT user_id, title INTO post_author, post_title
  FROM public.posts WHERE id = NEW.post_id;

  IF post_author IS NULL OR post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, message, link, post_id)
  VALUES (
    post_author,
    NEW.user_id,
    'like',
    'liked "' || COALESCE(post_title, 'your post') || '"',
    '/post/' || NEW.post_id,
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_post_like ON public.user_interactions;
CREATE TRIGGER trg_notify_on_post_like
AFTER INSERT OR UPDATE ON public.user_interactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

-- Also wire the existing notify_on_answer trigger if missing
DROP TRIGGER IF EXISTS trg_notify_on_answer ON public.answers;
CREATE TRIGGER trg_notify_on_answer
AFTER INSERT ON public.answers
FOR EACH ROW EXECUTE FUNCTION public.notify_on_answer();

-- Notification when a post is reported (warns the post author)
CREATE OR REPLACE FUNCTION public.notify_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
  post_title TEXT;
BEGIN
  SELECT user_id, title INTO post_author, post_title
  FROM public.posts WHERE id = NEW.post_id;

  IF post_author IS NULL OR post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, message, link, post_id)
  VALUES (
    post_author,
    NEW.user_id,
    'report',
    'reported your post "' || COALESCE(post_title, '') || '" — please review the community guidelines',
    '/post/' || NEW.post_id,
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_report ON public.reports;
CREATE TRIGGER trg_notify_on_report
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.notify_on_report();