REVOKE EXECUTE ON FUNCTION public.ensure_wallet() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.adjust_coins(integer, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_mission(text, integer, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.daily_check_in(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_status(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ensure_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_coins(integer, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mission(text, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_check_in(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_status(text) TO authenticated;