import { CheckCircle2, Coins, Home, Wallet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";

const WalletSuccessPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const coins = params.get("coins") ?? "0";

  return (
    <div className="animate-fade-in min-h-screen bg-background pb-6">
      <StatusBar />
      <div className="px-5 pt-10 flex flex-col items-center text-center">
        <div className="h-24 w-24 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">Congratulations!</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">Your coin purchase was successful and your wallet has been credited.</p>
        <div className="mt-6 w-full rounded-3xl gradient-night text-white p-5 shadow-elevated">
          <p className="text-xs text-white/75">Coins credited</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-5xl font-extrabold tabular-nums">{coins}</span>
            <Coins className="h-9 w-9 text-amber-300" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 w-full">
          <button onClick={() => navigate("/wallet", { replace: true })} className="rounded-2xl bg-primary text-primary-foreground font-bold py-3 inline-flex items-center justify-center gap-2 tap-scale">
            <Wallet className="h-4 w-4" /> Wallet
          </button>
          <button onClick={() => navigate("/home", { replace: true })} className="rounded-2xl bg-secondary text-secondary-foreground font-bold py-3 inline-flex items-center justify-center gap-2 tap-scale">
            <Home className="h-4 w-4" /> Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletSuccessPage;
