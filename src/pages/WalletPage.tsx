import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Wallet as WalletIcon, Crown, Gift, ShoppingCart, History, ArrowDownLeft, ArrowUpRight, Coins, Plus, Sparkles, FileText, UserPlus, Calendar, Flame, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { useWallet } from "@/hooks/useWallet";
import { COIN_PACKS, detectCurrency, formatPrice, purchase } from "@/lib/coins";
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
  const ccy = useMemo(() => detectCurrency(), []);

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

  const buyPack = async (packId: string, coins: number, price: number) => {
    // Mock checkout — instant grant
    try {
      await purchase(coins, `buy_${packId}`, { ccy, price });
      toast({ title: "Coins added!", description: `+${coins.toLocaleString()} coins` });
      refresh();
    } catch (e: any) {
      toast({ title: "Purchase failed", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  const xpFor = wallet?.xp ?? 0;
  const level = wallet?.level ?? 1;
  const nextLevelXp = level * 200;
  const xpPct = Math.min(100, Math.round((xpFor / nextLevelXp) * 100));

  return (
    <div className="animate-fade-in pb-6 bg-background">
      <StatusBar />

      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-none">Wallet</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Manage your coins</p>
          </div>
        </div>
        <button onClick={() => navigate("/notifications")} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
      </div>

      {/* HERO BALANCE */}
      <div className="px-5">
        <div className="relative rounded-2xl gradient-hero text-white p-5 overflow-hidden shadow-elevated">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/15 blur-3xl rounded-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] text-white/85 inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-300" /> {wallet?.streak_days ?? 0} Day Streak</p>
              <p className="text-xs text-white/80 mt-3">Your Balance</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-bold text-4xl tabular-nums">{(wallet?.coins ?? 0).toLocaleString()}</span>
                <Coins className="h-5 w-5 text-amber-300" />
              </div>
              <p className="text-[10px] text-white/80 mt-1">Coins · keep learning, keep achieving 🚀</p>
            </div>
            <button onClick={() => document.getElementById("packs")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white text-primary font-bold text-xs rounded-xl px-3 py-2 tap-scale inline-flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Buy Coins
            </button>
          </div>
          <div className="relative mt-4 rounded-xl bg-white/15 backdrop-blur p-2.5 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-300 flex items-center justify-center flex-shrink-0">
              <Crown className="h-4 w-4 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold leading-none">Smart Learner · Level {level}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${xpPct}%` }} />
              </div>
              <p className="text-[9px] text-white/85 mt-1">{xpFor} / {nextLevelXp} XP</p>
            </div>
            <p className="text-[10px] text-white/85">Next Lvl {level + 1}</p>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="px-5 mt-4 grid grid-cols-4 gap-2">
        <Quick icon={Gift} label="Earn Coins" sub="Tasks" color="bg-primary-soft text-primary" onClick={() => navigate("/missions")} />
        <Quick icon={ShoppingCart} label="Buy Coins" sub="Top up" color="bg-emerald-100 text-emerald-600" onClick={() => document.getElementById("packs")?.scrollIntoView({ behavior: "smooth" })} />
        <Quick icon={Crown} label="Rewards" sub="See all" color="bg-amber-100 text-amber-600" onClick={() => navigate("/missions")} />
        <Quick icon={History} label="History" sub="Activity" color="bg-blue-100 text-blue-600" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })} />
      </div>

      {/* COIN PACKS */}
      <div id="packs" className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base">Popular Coin Packs</h2>
          <button className="text-xs font-semibold text-primary">See All</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {COIN_PACKS.map((p) => (
            <div key={p.id} className={`relative rounded-2xl p-3 border ${p.best ? "border-primary bg-primary-soft/40" : "border-border bg-card"}`}>
              {p.best && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold">
                  🔥 Best Value
                </div>
              )}
              <div className="flex flex-col items-center text-center pt-1">
                <div className="text-2xl">🪙</div>
                <p className="font-bold text-lg leading-none mt-1">{p.coins.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Coins</p>
                {p.bonus && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{p.bonus}</p>}
                <button
                  onClick={() => buyPack(p.id, p.coins, p.prices[ccy])}
                  className="mt-2 w-full rounded-xl bg-primary-soft text-primary font-bold text-xs py-2 tap-scale"
                >
                  {formatPrice(p.prices[ccy], ccy)}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">Real payments coming soon · purchases credit instantly for testing</p>
      </div>

      {/* EARN COINS QUICK LIST */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base">Earn Coins</h2>
          <button onClick={() => navigate("/missions")} className="text-xs font-semibold text-primary">See All</button>
        </div>
        <div className="rounded-2xl bg-card border border-border divide-y divide-border">
          <EarnRow icon={Calendar} title="Daily Login" sub="Login daily to keep your streak" amount={5} cta="Open" onClick={() => navigate("/missions")} />
          <EarnRow icon={Flame} title="3 Day Streak" sub="Login for 3 consecutive days" amount={15} cta="Track" onClick={() => navigate("/missions")} />
          <EarnRow icon={UserPlus} title="Invite a Friend" sub="Invite friend and get rewards" amount={50} cta="Invite" onClick={() => toast({ title: "Coming soon", description: "Referral link generator on the way." })} />
          <EarnRow icon={FileText} title="Complete a Test" sub="Complete any test or quiz" amount={10} cta="Start" onClick={() => navigate("/create-test")} />
        </div>
      </div>

      {/* TRANSACTIONS */}
      <div id="history" className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base">Recent Transactions</h2>
          <button className="text-xs font-semibold text-primary">See All</button>
        </div>
        <div className="rounded-2xl bg-card border border-border divide-y divide-border">
          {txs.length === 0 ? (
            <div className="p-5 text-center text-xs text-muted-foreground">
              <WalletIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No transactions yet. Earn or buy coins to see your activity here.
            </div>
          ) : txs.map((t) => {
            const Icon = REASON_ICONS[t.reason] ?? Sparkles;
            const positive = t.amount > 0;
            return (
              <div key={t.id} className="px-3 py-2.5 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${positive ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                  {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{reasonLabel(t.reason)}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(t.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <p className={`font-bold text-sm tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                  {positive ? "+" : ""}{t.amount}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Quick = ({ icon: Icon, label, sub, color, onClick }: { icon: any; label: string; sub: string; color: string; onClick: () => void }) => (
  <button onClick={onClick} className="rounded-2xl p-2 bg-card border border-border tap-scale flex flex-col items-center gap-1">
    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-[10px] font-bold leading-none">{label}</p>
    <p className="text-[8px] text-muted-foreground">{sub}</p>
  </button>
);

const EarnRow = ({ icon: Icon, title, sub, amount, cta, onClick }: { icon: any; title: string; sub: string; amount: number; cta: string; onClick: () => void }) => (
  <div className="px-3 py-2.5 flex items-center gap-3">
    <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm truncate">{title}</p>
      <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
    </div>
    <p className="text-xs font-bold text-amber-600 inline-flex items-center gap-0.5"><Coins className="h-3 w-3" /> +{amount}</p>
    <button onClick={onClick} className="text-[10px] font-bold text-primary bg-primary-soft px-2.5 py-1.5 rounded-full tap-scale">{cta}</button>
  </div>
);

export default WalletPage;
