import { useEffect, useRef, useState } from "react";
import { ensureWallet, getWallet, type Wallet } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refresh = async () => {
    const w = await getWallet();
    setWallet(w);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const w = await ensureWallet();
      if (!cancelled) {
        setWallet(w);
        setLoading(false);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled || channelRef.current) return;

      // Build channel BEFORE subscribing — chaining .on() after .subscribe() throws.
      const ch = supabase.channel(`wallet-sync-${user.id}`);
      ch.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new) setWallet(payload.new as Wallet);
          else refresh();
          window.dispatchEvent(new CustomEvent("wallet-updated", { detail: { table: "wallets" } }));
        },
      );
      ch.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "mission_progress", filter: `user_id=eq.${user.id}` },
        () => window.dispatchEvent(new CustomEvent("wallet-updated", { detail: { table: "mission_progress" } })),
      );
      ch.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "coin_purchases", filter: `user_id=eq.${user.id}` },
        () => window.dispatchEvent(new CustomEvent("wallet-updated", { detail: { table: "coin_purchases" } })),
      );
      ch.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "coin_transactions", filter: `user_id=eq.${user.id}` },
        () => window.dispatchEvent(new CustomEvent("wallet-updated", { detail: { table: "coin_transactions" } })),
      );
      ch.subscribe();
      channelRef.current = ch;
    })();
    const onUpdate = () => refresh();
    window.addEventListener("wallet-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("wallet-updated", onUpdate);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return { wallet, loading, refresh };
}
