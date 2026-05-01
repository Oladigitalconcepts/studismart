ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_study_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_features boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_practice_streaks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start text,
  ADD COLUMN IF NOT EXISTS quiet_hours_end text;