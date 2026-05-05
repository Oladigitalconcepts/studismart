
-- Track coin purchases via Paystack to prevent webhook replay and ensure crediting only after confirmation.
CREATE TABLE public.coin_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL UNIQUE,
  pack_id text NOT NULL,
  coins integer NOT NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'paystack',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz
);

ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own purchases select" ON public.coin_purchases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own purchases insert" ON public.coin_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Idempotent credit function called by webhook (via service role).
CREATE OR REPLACE FUNCTION public.credit_purchase(_reference text)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.coin_purchases;
  w public.wallets;
BEGIN
  SELECT * INTO p FROM public.coin_purchases WHERE reference = _reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase not found: %', _reference; END IF;
  IF p.status = 'credited' THEN
    SELECT * INTO w FROM public.wallets WHERE user_id = p.user_id;
    RETURN w;
  END IF;

  INSERT INTO public.wallets (user_id) VALUES (p.user_id) ON CONFLICT DO NOTHING;
  UPDATE public.wallets
    SET coins = coins + p.coins,
        xp = xp + p.coins * 2,
        updated_at = now()
    WHERE user_id = p.user_id
    RETURNING * INTO w;

  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta)
    VALUES (p.user_id, p.coins, 'purchase', 'paystack_' || p.pack_id,
            jsonb_build_object('reference', p.reference, 'currency', p.currency, 'amount_minor', p.amount_minor));

  UPDATE public.coin_purchases
    SET status = 'credited', credited_at = now()
    WHERE id = p.id;

  RETURN w;
END;
$$;
