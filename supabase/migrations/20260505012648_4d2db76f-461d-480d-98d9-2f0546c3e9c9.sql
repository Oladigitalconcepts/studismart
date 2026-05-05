
REVOKE EXECUTE ON FUNCTION public.ensure_wallet() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.adjust_coins(integer, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_coins(integer, text, text, jsonb) TO authenticated;
