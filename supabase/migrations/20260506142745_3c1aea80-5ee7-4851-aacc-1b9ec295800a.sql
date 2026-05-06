-- Profile banner
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;

-- Banner storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Banner images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "Users can upload their own banner"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own banner"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own banner"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Phone OTP store (hashed)
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON public.phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires ON public.phone_otps(expires_at);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- No public policies: only the service role (edge function) can access this table.