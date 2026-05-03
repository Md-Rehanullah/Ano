ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS seed_author_name text;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;