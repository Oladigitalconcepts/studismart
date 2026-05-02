
-- Notifications feed table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'study_reminder' | 'streak' | 'achievement' | 'study_pack_ready' | 'system'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own notifications insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Push subscription storage (Web Push)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push select" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own push insert" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push delete" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Add reminder time + push toggle to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_time TEXT DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_streak_milestone INTEGER NOT NULL DEFAULT 0;
