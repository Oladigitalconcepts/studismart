
-- Tutor chats
CREATE TABLE public.tutor_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tutor_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_chats_user ON public.tutor_chats(user_id, updated_at DESC);
ALTER TABLE public.tutor_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chats select" ON public.tutor_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own chats insert" ON public.tutor_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own chats update" ON public.tutor_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own chats delete" ON public.tutor_chats FOR DELETE USING (auth.uid() = user_id);

-- Tutor messages
CREATE TABLE public.tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.tutor_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  action TEXT,
  coins_spent INTEGER NOT NULL DEFAULT 0,
  cached BOOLEAN NOT NULL DEFAULT false,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_messages_chat ON public.tutor_messages(chat_id, created_at);
ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own msgs select" ON public.tutor_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own msgs insert" ON public.tutor_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cached tutor responses
CREATE TABLE public.tutor_cache (
  hash TEXT PRIMARY KEY,
  tutor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cache read auth" ON public.tutor_cache FOR SELECT TO authenticated USING (true);

-- Daily free question tracker
CREATE TABLE public.tutor_daily_usage (
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  free_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.tutor_daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage select" ON public.tutor_daily_usage FOR SELECT USING (auth.uid() = user_id);

-- Server-side coin spend with idempotency for tutor actions
CREATE OR REPLACE FUNCTION public.spend_coins_for_tutor(_user_id UUID, _amount INTEGER, _reason TEXT, _idempotency_key TEXT)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.wallets;
BEGIN
  IF _amount < 0 THEN RAISE EXCEPTION 'amount must be non-negative'; END IF;

  IF _idempotency_key IS NOT NULL THEN
    PERFORM 1 FROM public.coin_transactions
      WHERE user_id = _user_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      SELECT * INTO w FROM public.wallets WHERE user_id = _user_id;
      RETURN w;
    END IF;
  END IF;

  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = _user_id FOR UPDATE;

  IF _amount = 0 THEN RETURN w; END IF;
  IF (w.coins - _amount) < 0 THEN RAISE EXCEPTION 'insufficient coins'; END IF;

  UPDATE public.wallets SET coins = coins - _amount, updated_at = now()
    WHERE user_id = _user_id RETURNING * INTO w;

  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta, idempotency_key)
    VALUES (_user_id, -_amount, 'spend', _reason, '{}'::jsonb, _idempotency_key)
    ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN w;
END;
$$;
