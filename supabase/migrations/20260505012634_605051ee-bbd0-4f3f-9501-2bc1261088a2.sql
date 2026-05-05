
-- WALLETS
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY,
  coins integer NOT NULL DEFAULT 50,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_login_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet select" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own wallet insert" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own wallet update" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,         -- positive=earn, negative=spend
  kind text NOT NULL,              -- 'earn' | 'spend' | 'purchase'
  reason text NOT NULL,            -- e.g. 'daily_login', 'unlock_skill', 'buy_pack_500'
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coin_tx_user_idx ON public.coin_transactions(user_id, created_at DESC);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx select" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tx insert" ON public.coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SKILLS catalog (admin-defined, public read)
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'sparkles',
  color text NOT NULL DEFAULT 'primary',
  level text NOT NULL DEFAULT 'Beginner',
  lessons_count integer NOT NULL DEFAULT 0,
  cost_coins integer NOT NULL DEFAULT 2,
  popular boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills public read" ON public.skills FOR SELECT USING (true);

-- SKILL LESSONS
CREATE TABLE public.skill_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  position integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  duration_min integer NOT NULL DEFAULT 10,
  xp_reward integer NOT NULL DEFAULT 10,
  coin_reward integer NOT NULL DEFAULT 1
);
ALTER TABLE public.skill_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons public read" ON public.skill_lessons FOR SELECT USING (true);

-- USER SKILLS (unlocks + progress)
CREATE TABLE public.user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  completed_lessons integer NOT NULL DEFAULT 0,
  last_lesson_at timestamptz,
  UNIQUE (user_id, skill_id)
);
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_skills select" ON public.user_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own user_skills insert" ON public.user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own user_skills update" ON public.user_skills FOR UPDATE USING (auth.uid() = user_id);

-- DAILY MISSIONS PROGRESS
CREATE TABLE public.mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_key text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  UNIQUE (user_id, mission_key, day)
);
CREATE INDEX mission_progress_user_day_idx ON public.mission_progress(user_id, day);
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own missions select" ON public.mission_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own missions insert" ON public.mission_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own missions update" ON public.mission_progress FOR UPDATE USING (auth.uid() = user_id);

-- Helper: ensure wallet exists for current user (callable from client)
CREATE OR REPLACE FUNCTION public.ensure_wallet()
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.wallets;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.wallets (user_id) VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = auth.uid();
  RETURN w;
END;
$$;

-- Atomic coin adjustment (handles earn/spend safely)
CREATE OR REPLACE FUNCTION public.adjust_coins(_amount integer, _kind text, _reason text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.wallets;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF (w.coins + _amount) < 0 THEN
    RAISE EXCEPTION 'insufficient coins';
  END IF;
  UPDATE public.wallets
    SET coins = coins + _amount,
        xp = xp + GREATEST(_amount, 0) * 2,
        updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO w;
  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta)
    VALUES (auth.uid(), _amount, _kind, _reason, _meta);
  RETURN w;
END;
$$;

-- Seed curated skills
INSERT INTO public.skills (slug, title, description, icon, color, level, lessons_count, cost_coins, popular, rating, sort_order) VALUES
  ('ui-ux-design', 'UI/UX Design', 'Design beautiful and user-friendly interfaces', 'palette', 'primary', 'Beginner', 12, 2, true, 4.8, 1),
  ('web-development', 'Web Development', 'Build websites using HTML, CSS, JavaScript', 'code', 'green', 'Beginner', 14, 2, true, 4.7, 2),
  ('data-analysis', 'Data Analysis', 'Learn to analyze data and make smart decisions', 'bar-chart-3', 'orange', 'Intermediate', 10, 2, false, 4.6, 3),
  ('public-speaking', 'Public Speaking', 'Speak confidently and present like a pro', 'mic', 'blue', 'Beginner', 8, 2, false, 4.5, 4),
  ('ai-basics', 'AI Basics', 'Understand the basics of Artificial Intelligence and how it works', 'bot', 'amber', 'Beginner', 12, 2, false, 4.9, 5),
  ('study-skills', 'Study Skills', 'Master note-taking, focus, and exam prep', 'book-open', 'pink', 'Beginner', 8, 2, false, 4.6, 6);

-- Seed lessons (3 quick lessons per skill placeholder)
INSERT INTO public.skill_lessons (skill_id, position, title, body, duration_min, xp_reward, coin_reward)
SELECT s.id, gs.n,
  'Lesson ' || gs.n || ': ' || s.title,
  'Introductory content for ' || s.title || ' lesson ' || gs.n || '.',
  10, 10, 1
FROM public.skills s, generate_series(1, 6) gs(n);

UPDATE public.skills s SET lessons_count = (SELECT COUNT(*) FROM public.skill_lessons l WHERE l.skill_id = s.id);
