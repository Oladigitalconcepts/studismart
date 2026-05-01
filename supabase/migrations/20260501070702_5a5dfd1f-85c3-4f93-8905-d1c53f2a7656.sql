ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS email_weekly_digest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_product_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_study_tips boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_security_alerts boolean NOT NULL DEFAULT true;