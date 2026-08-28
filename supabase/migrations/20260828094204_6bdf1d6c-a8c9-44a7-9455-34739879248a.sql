
-- 1. Profile fields for registration + onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS college text,
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS skills text,
  ADD COLUMN IF NOT EXISTS registration_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Existing users are considered already registered & onboarded.
UPDATE public.profiles SET registration_completed = true WHERE registration_completed = false;

-- 2. Underage rejection ledger (not readable by normal users)
CREATE TABLE IF NOT EXISTS public.underage_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  provider text,
  age integer,
  status text NOT NULL DEFAULT 'underage',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS underage_registrations_email_key
  ON public.underage_registrations (lower(email)) WHERE email IS NOT NULL;

GRANT ALL ON public.underage_registrations TO service_role;
ALTER TABLE public.underage_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view underage records" ON public.underage_registrations;
CREATE POLICY "Admins can view underage records"
  ON public.underage_registrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Registration state resolver
CREATE OR REPLACE FUNCTION public.get_registration_state()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_done boolean;
  v_onboarded boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN 'anonymous'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF EXISTS (
    SELECT 1 FROM public.underage_registrations u
    WHERE u.user_id = v_uid
       OR (v_email IS NOT NULL AND lower(u.email) = lower(v_email))
  ) THEN
    RETURN 'blocked';
  END IF;

  SELECT registration_completed, onboarding_completed
    INTO v_done, v_onboarded
  FROM public.profiles WHERE user_id = v_uid;

  IF v_done IS NULL OR v_done = false THEN RETURN 'new'; END IF;
  IF v_onboarded = false THEN RETURN 'onboarding'; END IF;
  RETURN 'existing';
END;
$$;

REVOKE ALL ON FUNCTION public.get_registration_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_registration_state() TO authenticated;

-- 4. Registration completion with server-side age enforcement
CREATE OR REPLACE FUNCTION public.complete_registration(
  p_display_name text,
  p_age integer,
  p_avatar_url text DEFAULT NULL,
  p_college text DEFAULT NULL,
  p_course text DEFAULT NULL,
  p_skills text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF EXISTS (
    SELECT 1 FROM public.underage_registrations u
    WHERE u.user_id = v_uid
       OR (v_email IS NOT NULL AND lower(u.email) = lower(v_email))
  ) THEN
    RETURN 'blocked';
  END IF;

  IF p_display_name IS NULL OR length(btrim(p_display_name)) < 2 THEN
    RAISE EXCEPTION 'A name of at least 2 characters is required';
  END IF;
  IF p_age IS NULL OR p_age < 1 OR p_age > 120 THEN
    RAISE EXCEPTION 'A valid age is required';
  END IF;

  -- Hard server-side age gate: 13 and under is rejected.
  IF p_age <= 13 THEN
    INSERT INTO public.underage_registrations (user_id, email, provider, age, status)
    VALUES (v_uid, v_email, 'google', p_age, 'underage')
    ON CONFLICT ((lower(email))) DO UPDATE SET user_id = EXCLUDED.user_id, age = EXCLUDED.age;

    DELETE FROM public.profiles WHERE user_id = v_uid;
    RETURN 'blocked';
  END IF;

  INSERT INTO public.profiles (user_id, display_name, age, avatar_url, college, course, skills, bio, location, registration_completed)
  VALUES (v_uid, btrim(p_display_name), p_age, p_avatar_url, p_college, p_course, p_skills, p_bio, p_location, true)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    age = EXCLUDED.age,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    college = EXCLUDED.college,
    course = EXCLUDED.course,
    skills = EXCLUDED.skills,
    bio = COALESCE(EXCLUDED.bio, public.profiles.bio),
    location = COALESCE(EXCLUDED.location, public.profiles.location),
    registration_completed = true,
    updated_at = now();

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.complete_registration(text,integer,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_registration(text,integer,text,text,text,text,text,text) TO authenticated;

-- 5. Onboarding completion flag
CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET onboarding_completed = true, updated_at = now()
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.complete_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;
