
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS exam_date date,
  ADD COLUMN IF NOT EXISTS weekly_goal integer NOT NULL DEFAULT 5;

-- Weekly leaderboard function (SECURITY DEFINER) returning anonymized display names + scores for this ISO week.
CREATE OR REPLACE FUNCTION public.weekly_leaderboard()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total_correct integer,
  total_questions integer,
  total_seconds integer,
  sessions integer,
  accuracy numeric,
  score numeric,
  rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH wk AS (
    SELECT
      pa.user_id,
      SUM(pa.correct)::int AS total_correct,
      SUM(pa.total)::int AS total_questions,
      SUM(pa.duration_seconds)::int AS total_seconds,
      COUNT(*)::int AS sessions
    FROM public.practice_attempts pa
    WHERE pa.finished_at >= date_trunc('week', now())
    GROUP BY pa.user_id
  ),
  scored AS (
    SELECT
      w.*,
      CASE WHEN w.total_questions > 0
        THEN ROUND((w.total_correct::numeric / w.total_questions) * 100, 1)
        ELSE 0 END AS accuracy,
      CASE WHEN w.total_questions > 0 AND w.total_seconds > 0
        THEN ROUND(
          ((w.total_correct::numeric / w.total_questions) * 70)
          + (LEAST((w.total_questions::numeric / GREATEST(w.total_seconds,1)) * 60 / 20, 1) * 30),
        1)
        ELSE 0 END AS score
    FROM wk w
  )
  SELECT
    s.user_id,
    COALESCE(p.display_name, 'Student') AS display_name,
    p.avatar_url,
    s.total_correct,
    s.total_questions,
    s.total_seconds,
    s.sessions,
    s.accuracy,
    s.score,
    RANK() OVER (ORDER BY s.score DESC, s.total_correct DESC)::int AS rank
  FROM scored s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY rank ASC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO authenticated;
