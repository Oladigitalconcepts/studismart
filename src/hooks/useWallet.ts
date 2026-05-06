import { useEffect, useState } from "react";
import { ensureWallet, getWallet, type Wallet } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const w = await getWallet();
    setWallet(w);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const w = await ensureWallet();
      if (!cancelled) {
        setWallet(w);
        setLoading(false);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      // Realtime: any DB change to this user's wallet refreshes everywhere.
      channel = supabase
        .channel(`wallet-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) setWallet(payload.new as Wallet);
            else refresh();
            window.dispatchEvent(new CustomEvent("wallet-updated"));
          },
        )
        .subscribe();
    })();
    const onUpdate = () => refresh();
    window.addEventListener("wallet-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("wallet-updated", onUpdate);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { wallet, loading, refresh };
}
