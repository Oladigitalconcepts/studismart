import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, Wallet as WalletIcon, Crown, Gift, ShoppingCart, History, ArrowDownLeft, ArrowUpRight, Coins, Plus, Sparkles, FileText, UserPlus, Calendar, Flame, Bot, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { useWallet } from "@/hooks/useWallet";
import { COIN_PACKS, detectCurrency, formatPrice } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Tx { id: string; amount: number; kind: string; reason: string; created_at: string; }

const REASON_ICONS: Record<string, any> = {
  daily_login: Calendar,
  mission_daily_login: Calendar,
  mission_streak_3: Flame,
  mission_complete_test: FileText,
  mission_ask_ai_tutor: Bot,
  mission_summarize_notes: FileText,
  mission_share_quiz: Sparkles,
  unlock_skill: Sparkles,
  generate_test: FileText,
  ai_tutor: Bot,
  summarize_notes: FileText,
  create_quiz_for_others: UserPlus,
  lesson_complete: Sparkles,
};

const reasonLabel = (r: string) => r.replace(/^mission_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const WalletPage = () => {
  const navigate = useNavigate();
  const { wallet, refresh } = useWallet();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<"verifying" | "success" | "failed" | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string>("");
  const ccy = useMemo(() => detectCurrency(), []);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("coin_transactions")
        .select("id, amount, kind, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setTxs((data ?? []) as Tx[]);
    };
    load();
    const onUpd = () => load();
    window.addEventListener("wallet-updated", onUpd);
    return () => window.removeEventListener("wallet-updated", onUpd);
  }, []);

  // Handle return from Paystack — poll the purchase row until webhook credits it.
  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) return;
    setVerifyingRef(reference);
    setVerifyState("verifying");
    setVerifyMsg("Hang tight while we confirm your payment with Paystack.");
    let attempts = 0;
    const clearUrl = () => {
      params.delete("reference"); params.delete("trxref");
      setParams(params, { replace: true });
    };
    const timer = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from("coin_purchases")
        .select("status, coins")
        .eq("reference", reference)
        .maybeSingle();
      if (data?.status === "credited") {
        clearInterval(timer);
        setVerifyState("success");
        setVerifyMsg(`+${data.coins.toLocaleString()} coins added to your wallet`);
        toast({ title: "Coins added", description: `+${data.coins.toLocaleString()} coins credited` });
        refresh();
        window.dispatchEvent(new CustomEvent("wallet-updated"));
        clearUrl();
        setTimeout(() => { setVerifyingRef(null); setVerifyState(null); }, 2200);
      } else if (data?.status === "failed") {
        clearInterval(timer);
        setVerifyState("failed");
        setVerifyMsg("Payment failed. No coins were charged.");
        toast({ title: "Payment failed", description: "No coins were credited.", variant: "destructive" });
        clearUrl();
      } else if (attempts >= 20) {
        clearInterval(timer);
        setVerifyState("failed");
        setVerifyMsg("We couldn't confirm your payment in time. Coins will appear once Paystack confirms.");
        clearUrl();
      }
    }, 1500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buyPack = async (packId: string) => {
    setBuying(packId);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: { pack_id: packId, currency: ccy, callback_url: `${window.location.origin}/wallet` },
      });
      if (error) throw error;
      if (!data?.authorization_url) throw new Error("No checkout URL returned");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      toast({ title: "Could not start payment", description: e?.message ?? "Try again", variant: "destructive" });
      setBuying(null);
    }
  };

  const xpFor = wallet?.xp ?? 0;
  const level = wallet?.level ?? 1;
  const nextLevelXp = level * 200;
  const xpPct = Math.min(100, Math.round((xpFor / nextLevelXp) * 100));
  const coins = wallet?.coins ?? 0;
  const needForTest = Math.max(0, 5 - coins);

  return (
    <div className="animate-fade-in pb-6 bg-slate-50 min-h-screen">
      <StatusBar />

      {/* PAYMENT VERIFICATION BANNER */}
      {verifyState && (
        <div className="px-5 pt-3">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border ${
              verifyState === "verifying"
                ? "bg-violet-50 border-violet-200 text-violet-900"
                : verifyState === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div className="h-9 w-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
              {verifyState === "verifying" && <Loader2 className="h-5 w-5 animate-spin text-violet-600" />}
              {verifyState === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {verifyState === "failed" && <XCircle className="h-5 w-5 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold leading-tight">
                {verifyState === "verifying" && "Verifying payment…"}
                {verifyState === "success" && "Coins added"}
                {verifyState === "failed" && "Payment failed"}
              </p>
              <p className="text-[11px] opacity-80 truncate">{verifyMsg}</p>
            </div>
            {verifyState !== "verifying" && (
              <button
                onClick={() => { setVerifyState(null); setVerifyingRef(null); }}
                className="h-7 w-7 rounded-lg hover:bg-white/60 flex items-center justify-center tap-scale"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center tap-scale">
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <div>
            <h1 className="font-extrabold text-[22px] leading-none tracking-tight text-slate-900">Wallet</h1>
            <p className="text-[11px] text-slate-500 mt-1.5">Manage your coins and unlock AI power</p>
          </div>
        </div>
        <button onClick={() => navigate("/notifications")} className="h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center tap-scale relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
      </div>

      {/* HERO BALANCE */}
      <div className="px-5">
        <div className="relative rounded-3xl gradient-night text-white p-5 overflow-hidden shadow-xl shadow-violet-900/20">
          <div className="absolute -right-12 -top-12 w-56 h-56 bg-violet-500/30 blur-3xl rounded-full" />
          <div className="absolute right-10 bottom-4 w-32 h-32 bg-amber-300/10 blur-2xl rounded-full" />

          {/* Streak + Buy */}
          <div className="relative flex items-start justify-between">
            <p className="text-[11px] inline-flex items-center gap-1 font-semibold">
              🔥 {wallet?.streak_days ?? 3} Day Streak! Keep it going! 🔥
            </p>
            <button onClick={() => document.getElementById("packs")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white text-violet-700 font-extrabold text-xs rounded-2xl px-4 py-2 tap-scale inline-flex items-center gap-1.5 shadow-lg">
              <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Buy Coins
            </button>
          </div>

          {/* Balance + coin illustration */}
          <div className="relative mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-white/80">Your Balance</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-extrabold text-5xl tabular-nums tracking-tight">{coins.toLocaleString()}</span>
                <span className="text-3xl">🪙</span>
              </div>
              <p className="text-[12px] text-white/85 mt-0.5 font-semibold inline-flex items-center gap-1">Coins <span className="opacity-60">›</span></p>
              <p className="text-[10px] text-white/70 mt-2">Keep learning, keep achieving! 🚀</p>
            </div>
            <div className="text-[64px] leading-none -mb-2 -mr-1 drop-shadow-2xl">🪙</div>
          </div>

          {/* Level bar */}
          <div className="relative mt-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-2.5 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <Crown className="h-4 w-4 text-white" fill="white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold leading-none">Smart Learner</p>
              <p className="text-[9px] text-white/70 mt-0.5">Level {level}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-300 to-violet-100" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-white/70 leading-none">Next Level {level + 1}</p>
              <p className="text-[10px] font-bold mt-1 tabular-nums">{xpFor}/{nextLevelXp} XP</p>
            </div>
            <div className="text-2xl ml-1">🎁</div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="px-5 mt-4">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-3 grid grid-cols-4 gap-2">
          <Quick icon="🎁" label="Earn Coins" sub="Complete tasks" tint="bg-violet-100" onClick={() => navigate("/missions")} />
          <Quick icon="🛒" label="Buy Coins" sub="Top up now" tint="bg-emerald-100" onClick={() => document.getElementById("packs")?.scrollIntoView({ behavior: "smooth" })} />
          <Quick icon="👑" label="Rewards" sub="See all rewards" tint="bg-amber-100" onClick={() => navigate("/missions")} />
          <Quick icon="🕒" label="History" sub="View activity" tint="bg-blue-100" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })} />
        </div>
      </div>

      {/* INSUFFICIENT BANNER */}
      {needForTest > 0 && (
        <div className="px-5 mt-3">
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <p className="flex-1 text-[12px] text-slate-800 leading-snug">
              You need <span className="font-extrabold text-amber-700">{needForTest} more coins</span> to generate your next test.
            </p>
            <button onClick={() => navigate("/create-test")} className="gradient-primary text-white text-[11px] font-extrabold rounded-xl px-3 py-2 tap-scale inline-flex items-center gap-1 shadow-sm">
              Go to AI Test ›
            </button>
          </div>
        </div>
      )}

      {/* COIN PACKS — 2 visible, slide for the rest */}
      <div id="packs" className="px-5 mt-4">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-[16px] text-slate-900">Popular Coin Packs</h2>
            <span className="text-[10px] text-slate-400 font-semibold">Swipe →</span>
          </div>
          <PackSlider
            packs={COIN_PACKS}
            ccy={ccy}
            buying={buying}
            verifyingRef={verifyingRef}
            onBuy={buyPack}
          />
          {verifyingRef && (
            <p className="text-[10px] text-violet-600 text-center mt-3 font-semibold">Verifying your payment with Paystack…</p>
          )}
        </div>
      </div>

      {/* EARN COINS — full width, above transactions */}
      <div className="px-5 mt-4">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-[15px] text-slate-900">Earn Coins</h2>
            <button onClick={() => navigate("/missions")} className="text-[11px] font-bold text-violet-600">See All</button>
          </div>
          <div className="space-y-2.5">
            <EarnRow icon="📅" iconBg="bg-violet-100" title="Daily Login" sub="Login daily to keep your streak" amount={5} cta="Claim" ctaCls="bg-violet-100 text-violet-700" onClick={() => navigate("/missions")} />
            <EarnRow icon="🔥" iconBg="bg-orange-100" title="3 Day Streak" sub="Login for 3 consecutive days" amount={15} cta="2/3" ctaCls="bg-violet-50 text-violet-700" onClick={() => navigate("/missions")} />
            <EarnRow icon="👥" iconBg="bg-blue-100" title="Invite a Friend" sub="Invite friend and get rewards" amount={50} cta="Invite" ctaCls="bg-violet-50 text-violet-700" onClick={() => toast({ title: "Coming soon" })} />
            <EarnRow icon="📝" iconBg="bg-amber-100" title="Complete a Test" sub="Complete any test or quiz" amount={10} cta="Start" ctaCls="bg-violet-50 text-violet-700" onClick={() => navigate("/create-test")} />
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS — full width, below */}
      <div id="history" className="px-5 mt-4">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-[15px] text-slate-900">Recent Transactions</h2>
            {txs.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm("Clear all transaction history? This cannot be undone.")) return;
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  const { error } = await supabase.from("coin_transactions").delete().eq("user_id", user.id);
                  if (error) { toast({ title: "Could not clear", description: error.message, variant: "destructive" }); return; }
                  setTxs([]);
                  toast({ title: "History cleared" });
                }}
                className="text-[11px] font-bold text-rose-600 inline-flex items-center gap-1"
              >
                Clear All
              </button>
            )}
          </div>
          {txs.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-slate-400">
              <WalletIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No transactions yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {txs.map((t) => {
                const positive = t.amount > 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 group">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${positive ? "bg-emerald-100" : "bg-rose-100"}`}>
                      {positive ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] text-slate-900 truncate">{reasonLabel(t.reason)}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(t.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className={`font-extrabold text-[13px] tabular-nums inline-flex items-center gap-0.5 ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                      {positive ? "+" : ""}{t.amount}<span className="text-base">🪙</span>
                    </p>
                    <button
                      onClick={async () => {
                        const { error } = await supabase.from("coin_transactions").delete().eq("id", t.id);
                        if (error) { toast({ title: "Could not delete", description: error.message, variant: "destructive" }); return; }
                        setTxs((cur) => cur.filter((x) => x.id !== t.id));
                      }}
                      className="h-7 w-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 tap-scale flex-shrink-0"
                      aria-label="Delete transaction"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PackSlider = ({ packs, ccy, buying, verifyingRef, onBuy }: { packs: typeof COIN_PACKS; ccy: any; buying: string | null; verifyingRef: string | null; onBuy: (id: string) => void }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pageCount = Math.max(1, Math.ceil(packs.length / 2));

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const pageW = el.clientWidth;
    const idx = Math.round(el.scrollLeft / pageW);
    setActive(Math.min(pageCount - 1, Math.max(0, idx)));
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex gap-3 -mx-4 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 scroll-smooth"
      >
        {packs.map((p) => (
          <div
            key={p.id}
            className={`relative snap-start flex-shrink-0 rounded-2xl p-3.5 ${p.best ? "border-2 border-violet-500 bg-violet-50/40" : "border border-slate-100 bg-white"}`}
            style={{ width: "calc((100% - 12px) / 2)" }}
          >
            {p.best && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500 text-white text-[9px] font-extrabold whitespace-nowrap shadow-sm">
                🔥 Best Value
              </div>
            )}
            <div className="flex flex-col items-center text-center pt-1">
              <div className="text-[34px] leading-none">{p.id === "pack_2500" ? "🎁" : "🪙"}</div>
              <p className="font-extrabold text-xl leading-none mt-2 text-slate-900 tabular-nums">{p.coins.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Coins</p>
              {p.bonus && <p className="text-[9px] text-emerald-600 font-extrabold mt-0.5 truncate max-w-full">{p.bonus}</p>}
              <button
                onClick={() => onBuy(p.id)}
                disabled={buying === p.id || verifyingRef !== null}
                className="mt-2.5 w-full rounded-xl bg-violet-50 text-violet-700 font-extrabold text-[12px] py-2 tap-scale inline-flex items-center justify-center gap-1 disabled:opacity-60"
              >
                {buying === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : formatPrice(p.prices[ccy], ccy)}
              </button>
            </div>
          </div>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${active === i ? "w-5 bg-violet-500" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </>
  );
};

const Quick = ({ icon, label, sub, tint, onClick }: { icon: string; label: string; sub: string; tint: string; onClick: () => void }) => (
  <button onClick={onClick} className="rounded-2xl p-2 tap-scale flex flex-col items-center gap-1.5">
    <div className={`h-11 w-11 rounded-2xl ${tint} flex items-center justify-center text-xl`}>
      {icon}
    </div>
    <p className="text-[11px] font-extrabold leading-none text-slate-900">{label}</p>
    <p className="text-[9px] text-slate-500 leading-none">{sub}</p>
  </button>
);

const EarnRow = ({ icon, iconBg, title, sub, amount, cta, ctaCls, onClick }: { icon: string; iconBg: string; title: string; sub: string; amount: number; cta: string; ctaCls: string; onClick: () => void }) => (
  <div className="flex items-center gap-2.5">
    <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 text-base`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-[12px] text-slate-900 truncate">{title}</p>
      <p className="text-[9px] text-slate-500 truncate">{sub}</p>
    </div>
    <p className="text-[11px] font-extrabold text-slate-900 inline-flex items-center gap-0.5">+{amount}<span>🪙</span></p>
    <button onClick={onClick} className={`text-[10px] font-extrabold ${ctaCls} px-2.5 py-1.5 rounded-lg tap-scale`}>{cta}</button>
  </div>
);

export default WalletPage;
