-- 1) Profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS x_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text;

-- 2) liked_posts table
CREATE TABLE IF NOT EXISTS public.liked_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS liked_posts_user_idx ON public.liked_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS liked_posts_post_idx ON public.liked_posts(post_id);

ALTER TABLE public.liked_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Liked posts viewable by everyone" ON public.liked_posts;
CREATE POLICY "Liked posts viewable by everyone"
  ON public.liked_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add their own likes" ON public.liked_posts;
CREATE POLICY "Users can add their own likes"
  ON public.liked_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own likes" ON public.liked_posts;
CREATE POLICY "Users can remove their own likes"
  ON public.liked_posts FOR DELETE USING (auth.uid() = user_id);

-- 3) Sync trigger from user_interactions -> liked_posts
CREATE OR REPLACE FUNCTION public.sync_liked_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.liked_posts
      WHERE user_id = OLD.user_id AND post_id = OLD.post_id;
    RETURN OLD;
  END IF;

  IF NEW.interaction_type = 'like' THEN
    INSERT INTO public.liked_posts (user_id, post_id)
    VALUES (NEW.user_id, NEW.post_id)
    ON CONFLICT (user_id, post_id) DO NOTHING;
  ELSE
    DELETE FROM public.liked_posts
      WHERE user_id = NEW.user_id AND post_id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_liked_posts_ins ON public.user_interactions;
CREATE TRIGGER trg_sync_liked_posts_ins
  AFTER INSERT ON public.user_interactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_liked_posts();

DROP TRIGGER IF EXISTS trg_sync_liked_posts_upd ON public.user_interactions;
CREATE TRIGGER trg_sync_liked_posts_upd
  AFTER UPDATE ON public.user_interactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_liked_posts();

DROP TRIGGER IF EXISTS trg_sync_liked_posts_del ON public.user_interactions;
CREATE TRIGGER trg_sync_liked_posts_del
  AFTER DELETE ON public.user_interactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_liked_posts();

-- Backfill existing likes
INSERT INTO public.liked_posts (user_id, post_id, created_at)
SELECT user_id, post_id, COALESCE(updated_at, created_at)
FROM public.user_interactions
WHERE interaction_type = 'like'
ON CONFLICT (user_id, post_id) DO NOTHING;

-- 4) Allow editing seed posts any time
CREATE OR REPLACE FUNCTION public.enforce_post_edit_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.is_seed, false) = true THEN
    RETURN NEW;
  END IF;

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

-- 5) Topic-specific images for the gaming/anime/JEE/physics seed posts
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80' WHERE id = '2358176b-56d5-4572-9565-b7808ceb84f3'; -- BGMI
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&q=80' WHERE id = 'e9ebc2c0-08a6-4980-812f-7aa919d83e81'; -- Free Fire vs BGMI
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=1200&q=80' WHERE id = 'a606fd83-8044-44bf-9835-be27669fc0dc'; -- Valorant ace
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1606318801954-d46d46d3360a?w=1200&q=80' WHERE id = 'd206cc5c-457a-4260-ac74-ca666e1017a9'; -- PC vs PS5
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80' WHERE id = 'b319754e-e336-4803-b0a7-1997fe5e48ae'; -- beginner anime
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=1200&q=80' WHERE id = '3baa7641-2729-43d4-abdd-100e3e971b57'; -- manga vs anime
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80' WHERE id = '928686c1-012b-4622-9e09-afedd71020b0'; -- physics notes (formula board)
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&q=80' WHERE id = '04a2ecfd-c682-4320-a501-773709a73d4d'; -- class 10 maths
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=1200&q=80' WHERE id = '40b175dc-2235-440f-bee5-b9aebe2e27ff'; -- JEE 2026 prep (study desk)
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=1200&q=80' WHERE id = '8b993cdb-6355-4ec5-a293-0d409fa3bdb3'; -- IIT brand
UPDATE public.posts SET image_url = 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&q=80' WHERE id = '945cc1c2-b13a-425f-893e-82e3af67406c'; -- JEE/NEET regional

-- 6) Category-based images for remaining seed posts
DO $$
DECLARE
  imgs_tech text[] := ARRAY[
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80'
  ];
  imgs_edu text[] := ARRAY[
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
    'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1200&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
    'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&q=80',
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80'
  ];
  imgs_life text[] := ARRAY[
    'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1200&q=80',
    'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1200&q=80',
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
    'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=1200&q=80',
    'https://images.unsplash.com/photo-1502301103665-0b95cc738daf?w=1200&q=80'
  ];
  imgs_general text[] := ARRAY[
    'https://images.unsplash.com/photo-1524492449090-1a065f6ab1e6?w=1200&q=80',
    'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=1200&q=80',
    'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=80',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80',
    'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1200&q=80'
  ];
  imgs_other text[] := ARRAY[
    'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=1200&q=80',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80',
    'https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=1200&q=80',
    'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=1200&q=80'
  ];
  rec record;
  pool text[];
  idx int;
BEGIN
  FOR rec IN
    SELECT id, category FROM public.posts
    WHERE is_seed = true AND (image_url IS NULL OR image_url = '')
  LOOP
    IF rec.category = 'Technology' THEN pool := imgs_tech;
    ELSIF rec.category = 'Education' THEN pool := imgs_edu;
    ELSIF rec.category = 'Lifestyle' THEN pool := imgs_life;
    ELSIF rec.category = 'General' THEN pool := imgs_general;
    ELSE pool := imgs_other;
    END IF;
    idx := 1 + (abs(hashtext(rec.id::text)) % array_length(pool, 1));
    UPDATE public.posts SET image_url = pool[idx] WHERE id = rec.id;
  END LOOP;
END $$;