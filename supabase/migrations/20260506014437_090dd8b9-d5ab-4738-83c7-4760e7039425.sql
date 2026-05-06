CREATE OR REPLACE FUNCTION public.claim_mission(_mission_key text, _reward integer DEFAULT NULL, _target integer DEFAULT NULL, _idempotency_key text DEFAULT NULL)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  d date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  mp public.mission_progress;
  w public.wallets;
  reward_amount integer;
  target_count integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  reward_amount := CASE _mission_key
    WHEN 'daily_login' THEN 5
    WHEN 'streak_3' THEN 15
    WHEN 'complete_test' THEN 10
    WHEN 'ask_ai_tutor' THEN 5
    WHEN 'summarize_notes' THEN 10
    WHEN 'share_quiz' THEN 10
    WHEN 'invite_friends' THEN 150
    WHEN 'topper' THEN 100
    WHEN 'weekly_champion' THEN 200
    ELSE NULL
  END;

  target_count := CASE _mission_key
    WHEN 'daily_login' THEN 1
    WHEN 'streak_3' THEN 3
    WHEN 'complete_test' THEN 1
    WHEN 'ask_ai_tutor' THEN 1
    WHEN 'summarize_notes' THEN 1
    WHEN 'share_quiz' THEN 1
    WHEN 'invite_friends' THEN 3
    WHEN 'topper' THEN 1
    WHEN 'weekly_champion' THEN 5
    ELSE NULL
  END;

  IF reward_amount IS NULL OR target_count IS NULL THEN
    RAISE EXCEPTION 'unknown mission';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    PERFORM 1 FROM public.coin_transactions
      WHERE user_id = uid AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      SELECT * INTO w FROM public.wallets WHERE user_id = uid;
      RETURN w;
    END IF;
  END IF;

  INSERT INTO public.mission_progress (user_id, mission_key, day, count)
    VALUES (uid, _mission_key, d, 0)
    ON CONFLICT DO NOTHING;

  SELECT * INTO mp FROM public.mission_progress
    WHERE user_id = uid AND mission_key = _mission_key AND day = d
    FOR UPDATE;

  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;

  IF mp.claimed_at IS NOT NULL THEN
    RETURN w;
  END IF;

  IF mp.count < target_count THEN
    RAISE EXCEPTION 'mission not ready';
  END IF;

  UPDATE public.mission_progress SET claimed_at = now() WHERE id = mp.id;

  UPDATE public.wallets
    SET coins = coins + reward_amount,
        xp = xp + reward_amount * 2,
        updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;

  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta, idempotency_key)
    VALUES (uid, reward_amount, 'earn', 'mission_' || _mission_key, jsonb_build_object('mission', _mission_key), _idempotency_key)
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN w;
END;
$function$;

CREATE OR REPLACE FUNCTION public.daily_check_in(_reward integer DEFAULT 5)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  d date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  w public.wallets;
  mp public.mission_progress;
  prev_date date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO public.mission_progress (user_id, mission_key, day, count)
    VALUES (uid, 'daily_login', d, 1)
    ON CONFLICT DO NOTHING;

  SELECT * INTO mp FROM public.mission_progress
    WHERE user_id = uid AND mission_key = 'daily_login' AND day = d
    FOR UPDATE;

  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;

  IF mp.claimed_at IS NOT NULL THEN
    RETURN w;
  END IF;

  prev_date := w.last_login_date;

  UPDATE public.mission_progress
    SET claimed_at = now(), count = GREATEST(count, 1)
    WHERE id = mp.id;

  UPDATE public.wallets
    SET coins = coins + 5,
        xp = xp + 10,
        streak_days = CASE
          WHEN prev_date = d THEN streak_days
          WHEN prev_date = d - INTERVAL '1 day' THEN streak_days + 1
          ELSE 1
        END,
        last_login_date = d,
        updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;

  INSERT INTO public.mission_progress (user_id, mission_key, day, count)
    VALUES (uid, 'streak_3', d, LEAST(w.streak_days, 3))
    ON CONFLICT (user_id, mission_key, day)
    DO UPDATE SET count = GREATEST(public.mission_progress.count, EXCLUDED.count);

  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta, idempotency_key)
    VALUES (uid, 5, 'earn', 'daily_check_in', jsonb_build_object('day', d), 'daily_' || d::text)
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN w;
END;
$function$;

DROP POLICY IF EXISTS "own wallet update" ON public.wallets;
DROP POLICY IF EXISTS "own tx insert" ON public.coin_transactions;