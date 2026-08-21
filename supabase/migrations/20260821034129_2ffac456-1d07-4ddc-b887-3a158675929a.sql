DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Signed-in users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='shared_quizzes' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.shared_quizzes', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Creators can view their shared quizzes"
ON public.shared_quizzes FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

REVOKE SELECT ON public.shared_quizzes FROM anon;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='tutor_cache'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.tutor_cache', p.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.tutor_cache FROM anon, authenticated;
GRANT ALL ON public.tutor_cache TO service_role;

REVOKE ALL ON FUNCTION public.daily_check_in(integer) FROM anon, public;
REVOKE ALL ON FUNCTION public.claim_mission(text, integer, integer, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.adjust_coins(integer, text, text, jsonb) FROM anon, public;
REVOKE ALL ON FUNCTION public.ensure_wallet() FROM anon, public;
REVOKE ALL ON FUNCTION public.purchase_status(text) FROM anon, public;
REVOKE ALL ON FUNCTION public.weekly_leaderboard() FROM anon, public;

CREATE OR REPLACE FUNCTION public.purchase_status(_reference text)
RETURNS TABLE(status text, coins integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
    SELECT cp.status, cp.coins FROM public.coin_purchases cp
     WHERE cp.reference = _reference AND cp.user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.weekly_leaderboard()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total_correct integer, total_questions integer, total_seconds integer, sessions integer, accuracy numeric, score numeric, rank integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
  WITH wk AS (
    SELECT pa.user_id,
      SUM(pa.correct)::int AS total_correct,
      SUM(pa.total)::int AS total_questions,
      SUM(pa.duration_seconds)::int AS total_seconds,
      COUNT(*)::int AS sessions
    FROM public.practice_attempts pa
    WHERE pa.finished_at >= date_trunc('week', now())
    GROUP BY pa.user_id
  ),
  scored AS (
    SELECT w.*,
      CASE WHEN w.total_questions > 0
        THEN ROUND((w.total_correct::numeric / w.total_questions) * 100, 1)
        ELSE 0 END AS accuracy,
      CASE WHEN w.total_questions > 0 AND w.total_seconds > 0
        THEN ROUND(((w.total_correct::numeric / w.total_questions) * 70)
          + (LEAST((w.total_questions::numeric / GREATEST(w.total_seconds,1)) * 60 / 20, 1) * 30), 1)
        ELSE 0 END AS score
    FROM wk w
  )
  SELECT s.user_id,
    COALESCE(p.display_name, 'Student') AS display_name,
    p.avatar_url, s.total_correct, s.total_questions, s.total_seconds,
    s.sessions, s.accuracy, s.score,
    RANK() OVER (ORDER BY s.score DESC, s.total_correct DESC)::int AS rank
  FROM scored s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY rank ASC
  LIMIT 100;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.purchase_status(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO authenticated, service_role;