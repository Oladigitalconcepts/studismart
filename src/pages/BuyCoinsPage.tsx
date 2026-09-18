import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Coins, Loader2, ShieldCheck, Sparkles, Gift } from "lucide-react";
import { StatusBar } from "@/components/studymind/StatusBar";
import { useWallet } from "@/hooks/useWallet";
import { COIN_PACKS, COSTS, detectCurrency, formatPrice } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";

const PERKS = [
  { icon: Sparkles, label: "AI semester roadmaps", cost: COSTS.generate_roadmap },
  { icon: Sparkles, label: "AI practice tests", cost: COSTS.generate_test },
  { icon: Sparkles, label: "AI tutor answers", cost: COSTS.ai_tutor },
  { icon: Sparkles, label: "Note summaries", cost: COSTS.summarize_notes },
];

const BuyCoinsPage = () => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const ccy = useMemo(() => detectCurrency(), []);
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string>(
    COIN_PACKS.find((p) => p.best)?.id ?? COIN_PACKS[0].id,
  );
  const [buying, setBuying] = useState(false);
  const returnTo = params.get("returnTo") || "";

  const pack = COIN_PACKS.find((p) => p.id === selected) ?? COIN_PACKS[0];

  const checkout = async () => {
    if (buying) return;
    setBuying(true);
    haptic();
    try {
      const callback = `${window.location.origin}/wallet${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: { pack_id: pack.id, currency: ccy, callback_url: callback },
      });
      if (error) throw error;
      if (!data?.authorization_url) throw new Error("No checkout URL returned");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      toast({
        title: "Could not start payment",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
      setBuying(false);
    }
  };

  return (
    <div className="animate-fade-in min-h-screen bg-slate-50 pb-40">
      <StatusBar />

      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center tap-scale"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div className="min-w-0">
          <h1 className="font-extrabold text-[22px] leading-none tracking-tight text-slate-900">Buy Coins</h1>
          <p className="text-[11px] text-slate-500 mt-1.5">Unlock premium roadmaps & study plans</p>
        </div>
      </div>

      {/* Balance */}
      <div className="px-5">
        <div className="rounded-3xl gradient-night text-white p-4 flex items-center gap-3 shadow-xl shadow-violet-900/20">
          <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">🪙</div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/75">Current balance</p>
            <p className="font-extrabold text-2xl tabular-nums leading-tight">
              {(wallet?.coins ?? 0).toLocaleString()} <span className="text-sm font-bold">coins</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/missions")}
            className="rounded-2xl bg-white/15 px-3 py-2 text-[11px] font-extrabold inline-flex items-center gap-1.5 tap-scale"
          >
            <Gift className="h-3.5 w-3.5" /> Earn free
          </button>
        </div>
      </div>

      {/* Packs */}
      <div className="px-5 mt-4 space-y-2.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Choose a pack</p>
        {COIN_PACKS.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              onClick={() => { setSelected(p.id); haptic(); }}
              className={`w-full text-left rounded-3xl p-4 border transition-all tap-scale flex items-center gap-3 ${
                active
                  ? "bg-white border-violet-400 ring-2 ring-violet-200 shadow-md"
                  : "bg-white border-slate-100 shadow-sm"
              }`}
            >
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${active ? "bg-violet-100" : "bg-slate-100"}`}>
                🪙
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[16px] text-slate-900 leading-none">
                  {p.coins.toLocaleString()} coins
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {p.bonus && (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                      {p.bonus}
                    </span>
                  )}
                  {p.best && (
                    <span className="text-[10px] font-extrabold text-violet-700 bg-violet-50 rounded-full px-2 py-0.5">
                      Most popular
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-extrabold text-[15px] text-slate-900">{formatPrice(p.prices[ccy], ccy)}</p>
                <div className={`mt-1.5 h-5 w-5 ml-auto rounded-full flex items-center justify-center ${active ? "bg-violet-600" : "border border-slate-300"}`}>
                  {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* What coins unlock */}
      <div className="px-5 mt-5">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="font-extrabold text-[15px] text-slate-900">What your coins unlock</p>
          <div className="mt-3 space-y-2.5">
            {PERKS.map((perk) => (
              <div key={perk.label} className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <perk.icon className="h-4 w-4 text-violet-600" />
                </div>
                <p className="flex-1 text-[13px] text-slate-700 font-medium min-w-0 break-words">{perk.label}</p>
                <span className="text-[11px] font-extrabold text-slate-900 inline-flex items-center gap-1 flex-shrink-0">
                  <Coins className="h-3.5 w-3.5 text-amber-500" /> {perk.cost}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Secure payment · coins never expire
          </p>
        </div>
      </div>

      {/* Sticky checkout */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pt-3 pb-6 bg-white/90 backdrop-blur border-t border-slate-100 safe-bottom">
        <button
          onClick={checkout}
          disabled={buying}
          className="w-full h-14 rounded-2xl gradient-primary text-white font-extrabold text-[15px] tap-scale inline-flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {buying ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Opening secure checkout…</>
          ) : (
            <>Pay {formatPrice(pack.prices[ccy], ccy)} · Get {pack.coins.toLocaleString()} coins</>
          )}
        </button>
      </div>
    </div>
  );
};

export default BuyCoinsPage;
