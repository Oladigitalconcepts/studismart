-- 1) Scope avatar reads to the owner's folder
DROP POLICY IF EXISTS "Signed-in users can view avatars" ON storage.objects;
CREATE POLICY "Users can view their own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2) Reduce SECURITY DEFINER surface: these only touch the caller's own rows,
-- which RLS already enforces, so run them as SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.ensure_wallet()
 RETURNS public.wallets
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.purchase_status(_reference text)
 RETURNS TABLE(status text, coins integer)
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY
    SELECT cp.status, cp.coins FROM public.coin_purchases cp
     WHERE cp.reference = _reference AND cp.user_id = auth.uid();
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_wallet() FROM anon, public;
REVOKE ALL ON FUNCTION public.purchase_status(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_wallet() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purchase_status(text) TO authenticated, service_role;