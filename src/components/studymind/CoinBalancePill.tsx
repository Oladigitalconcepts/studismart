// Reusable pill that shows the user's coin balance and links to Wallet.
// Sits next to the Notifications bell on every authenticated screen header.
import { Wallet as WalletIcon, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";

export const CoinBalancePill = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const coins = wallet?.coins ?? 0;
  return (
    <button
      onClick={() => navigate("/wallet")}
      className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-soft tap-scale"
      aria-label="Open wallet"
    >
      <WalletIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span className={`font-bold tabular-nums ${compact ? "text-[11px]" : "text-xs"}`}>
        {coins.toLocaleString()}
      </span>
      <span className="h-5 w-5 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
        <Plus className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );
};
