CREATE OR REPLACE FUNCTION public.daily_check_in(_reward integer DEFAULT 5)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  d date := (now() AT TIME ZONE 'utc')::date;
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
    SET coins = coins + _reward,
        xp = xp + _reward * 2,
        streak_days = CASE
          WHEN prev_date = d THEN streak_days
          WHEN prev_date = d - INTERVAL '1 day' THEN streak_days + 1
          ELSE 1
        END,
        last_login_date = d,
        updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;

  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta, idempotency_key)
    VALUES (uid, _reward, 'earn', 'daily_check_in', jsonb_build_object('day', d), 'daily_' || d::text)
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN w;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mission_progress'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_progress';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coin_purchases'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_purchases';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coin_transactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions';
  END IF;
END $$;