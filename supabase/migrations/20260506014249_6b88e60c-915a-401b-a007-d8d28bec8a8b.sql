CREATE OR REPLACE FUNCTION public.adjust_coins(_amount integer, _kind text, _reason text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  w public.wallets;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount > 0 THEN RAISE EXCEPTION 'coin credits must use a protected reward or purchase flow'; END IF;
  IF _kind <> 'spend' THEN RAISE EXCEPTION 'invalid coin adjustment kind'; END IF;

  INSERT INTO public.wallets (user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF (w.coins + _amount) < 0 THEN
    RAISE EXCEPTION 'insufficient coins';
  END IF;
  UPDATE public.wallets
    SET coins = coins + _amount,
        updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO w;
  INSERT INTO public.coin_transactions (user_id, amount, kind, reason, meta)
    VALUES (auth.uid(), _amount, _kind, _reason, _meta);
  RETURN w;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.adjust_coins(integer, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_coins(integer, text, text, jsonb) TO authenticated;