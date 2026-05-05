import { useEffect, useState } from "react";
import { ensureWallet, getWallet, type Wallet } from "@/lib/coins";

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
    (async () => {
      const w = await ensureWallet();
      if (!cancelled) {
        setWallet(w);
        setLoading(false);
      }
    })();
    const onUpdate = () => refresh();
    window.addEventListener("wallet-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("wallet-updated", onUpdate);
    };
  }, []);

  return { wallet, loading, refresh };
}
