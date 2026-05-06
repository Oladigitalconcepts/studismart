
-- 1) Idempotency key on coin_transactions
ALTER TABLE public.coin_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS coin_tx_user_idem_key
  ON public.coin_transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2) Server-side atomic mission claim
CREATE OR REPLACE FUNCTION public.claim_mission(_mission_key text, _reward integer, _target integer, _idempotency_key text DEFAULT NULL)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  d date := (now() AT TIME ZONE 'utc')::date;
  mp public.mission_progress;
  w public.wallets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Idempotency short-circuit: if a tx with this key already exists, just return wallet.
  IF _idempotency_key IS NOT NULL THEN
    PERFORM 1 FROM public.coin_transactions
      WHERE user_id = uid AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      SELECT * INTO w FROM public.wallets WHERE user_id = uid;
      RETURN w;
    END IF;
  END IF;

  -- Ensure progress row, then lock it
  INSERT INTO public.mission_progress (user_id, mission_key, day, count)
    VALUES (uid, _mission_key, d, 0)
    ON CONFLICT DO NOTHING;

  SELECT * INTO mp FROM public.mission_progress
    WHERE user_id = uid AND mission_key = _mission_key AND day = d
    FOR UPDATE;

  IF mp.claimed_at IS NOT NULL THEN
    SELECT * INTO w FROM public.wallets WHERE user_id = uid;
    RETURN w;
  END IF;

  IF mp.count < _target THEN
    RAISE EXCEPTION 'mission not ready';
  END IF;

  UPDATE public.mission_progress SET claimed_at = now() WHERE id = mp.id;

  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  UPDATE public.wallets
    SET coins = coins + _reward,
        xp = xp + _reward * 2,
        updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;

  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta, idempotency_key)
    VALUES (uid, _reward, 'earn', 'mission_' || _mission_key, jsonb_build_object('mission', _mission_key), _idempotency_key);

  RETURN w;
END;
$$;

-- 3) Atomic daily check-in (one per UTC day per user)
CREATE OR REPLACE FUNCTION public.daily_check_in(_reward integer DEFAULT 5)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Already checked in today → just return wallet, do not credit again.
  IF mp.claimed_at IS NOT NULL THEN
    SELECT * INTO w FROM public.wallets WHERE user_id = uid;
    RETURN w;
  END IF;

  UPDATE public.mission_progress SET claimed_at = now(), count = GREATEST(count, 1) WHERE id = mp.id;

  -- Streak update
  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT last_login_date INTO prev_date FROM public.wallets WHERE user_id = uid FOR UPDATE;

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
    VALUES (uid, _reward, 'earn', 'daily_check_in', jsonb_build_object('day', d), 'daily_' || d::text);

  RETURN w;
END;
$$;

-- 4) Helper to read purchase status (used by client polling)
CREATE OR REPLACE FUNCTION public.purchase_status(_reference text)
RETURNS TABLE(status text, coins integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, coins FROM public.coin_purchases
   WHERE reference = _reference AND user_id = auth.uid();
$$;

-- 5) Realtime: broadcast wallet changes
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='wallets';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets';
  END IF;
END $$;
