import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Flame, FileText, Bot, StickyNote, Share2, UserPlus, Trophy, ShieldCheck, Coins, Gift, Lock, CheckCircle2, Info, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { useWallet } from "@/hooks/useWallet";
import { DAILY_MISSIONS, BONUS_MISSIONS, fetchTodayMissions, claimMission, type MissionDef, type MissionRow, triggerDailyLogin } from "@/lib/missions";
import { earn } from "@/lib/coins";
import { toast } from "@/hooks/use-toast";

const ICONS: Record<string, any> = {
  calendar: Calendar, flame: Flame, "file-text": FileText, bot: Bot, "sticky-note": StickyNote,
  "share-2": Share2, "user-plus": UserPlus, trophy: Trophy, "shield-check": ShieldCheck, star: Star,
};

const TILE: Record<string, { tile: string; bg: string; fg: string; btn: string; bar: string; bonusBg: string }> = {
  primary: { tile: "bg-gradient-to-br from-violet-500 to-violet-600", bg: "bg-violet-100", fg: "text-violet-600", btn: "bg-violet-500", bar: "bg-violet-500", bonusBg: "bg-amber-50" },
  green:   { tile: "bg-gradient-to-br from-emerald-500 to-emerald-600", bg: "bg-emerald-100", fg: "text-emerald-600", btn: "bg-emerald-500", bar: "bg-emerald-500", bonusBg: "bg-emerald-50" },
  blue:    { tile: "bg-gradient-to-br from-blue-500 to-blue-600", bg: "bg-blue-100", fg: "text-blue-600", btn: "bg-blue-500", bar: "bg-blue-500", bonusBg: "bg-blue-50" },
  amber:   { tile: "bg-gradient-to-br from-amber-500 to-orange-500", bg: "bg-amber-100", fg: "text-amber-600", btn: "bg-amber-500", bar: "bg-amber-500", bonusBg: "bg-amber-50" },
  pink:    { tile: "bg-gradient-to-br from-pink-500 to-rose-500", bg: "bg-pink-100", fg: "text-pink-600", btn: "bg-pink-500", bar: "bg-pink-500", bonusBg: "bg-pink-50" },
  teal:    { tile: "bg-gradient-to-br from-teal-500 to-cyan-500", bg: "bg-teal-100", fg: "text-teal-600", btn: "bg-teal-500", bar: "bg-teal-500", bonusBg: "bg-teal-50" },
};

const AD_LIMIT = 3;
const AD_KEY = () => `ad-watched-${new Date().toISOString().slice(0, 10)}`;

const MissionsPage = () => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const [progress, setProgress] = useState<Record<string, MissionRow>>({});
  const [adsWatched, setAdsWatched] = useState(0);

  const load = async () => {
    await triggerDailyLogin();
    const map = await fetchTodayMissions();
    setProgress(map);
    try { setAdsWatched(parseInt(localStorage.getItem(AD_KEY()) || "0", 10) || 0); } catch { /* noop */ }
  };

  useEffect(() => {
    load();
    const onUpd = () => load();
    window.addEventListener("wallet-updated", onUpd);
    return () => window.removeEventListener("wallet-updated", onUpd);
  }, []);

  const streakDays = wallet?.streak_days ?? 0;
  const completedCount = useMemo(() => DAILY_MISSIONS.filter((m) => progress[m.key]?.claimed_at).length, [progress]);

  const handleClaim = async (m: MissionDef) => {
    try { await claimMission(m); toast({ title: `+${m.reward} coins`, description: `${m.title} claimed!` }); load(); }
    catch (e: any) { toast({ title: "Could not claim", description: e?.message ?? "Try again", variant: "destructive" }); }
  };

  const watchAd = async () => {
    if (adsWatched >= AD_LIMIT) { toast({ title: "Daily ad limit reached", description: "Come back tomorrow." }); return; }
    toast({ title: "Loading ad…", description: "Demo mode — instant reward." });
    setTimeout(async () => {
      await earn(5, "watch_ad");
      const next = adsWatched + 1; setAdsWatched(next);
      try { localStorage.setItem(AD_KEY(), String(next)); } catch { /* noop */ }
      toast({ title: "+5 coins", description: "Thanks for watching!" });
    }, 600);
  };

  return (
    <div className="animate-fade-in pb-6 bg-white">
      <StatusBar />

      {/* DARK HERO */}
      <div className="relative gradient-night text-white px-5 pt-3 pb-7 overflow-hidden">
        <div className="absolute -right-16 -top-20 w-72 h-72 bg-violet-500/20 blur-3xl rounded-full" />
        <div className="absolute -left-16 top-32 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full" />

        <div className="relative flex items-start justify-between">
          <button onClick={() => navigate(-1)} className="h-11 w-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center tap-scale border border-white/10">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1 px-3">
            <h1 className="font-extrabold text-[22px] leading-none tracking-tight inline-flex items-center gap-2">
              Daily Missions <Info className="h-3.5 w-3.5 text-white/50" />
            </h1>
            <p className="text-white/70 text-[11px] mt-1.5">Complete missions and earn coins</p>
          </div>
          <CoinBalancePill />
        </div>

        {/* Streak card */}
        <div className="relative mt-5 rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/10 p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="font-extrabold text-base inline-flex items-center gap-1.5">🔥 {streakDays} Day Streak</p>
              <p className="text-[11px] text-white/70 mt-1.5 leading-snug">Keep it up! {Math.max(0, 5 - streakDays)} more days to unlock bonus reward.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl">💰</div>
              <div>
                <p className="text-[10px] text-white/70">Streak Reward</p>
                <p className="font-extrabold text-base inline-flex items-center gap-1">+50 🪙 <Lock className="h-3 w-3 text-white/50" /></p>
                <p className="text-[9px] text-white/60 leading-tight">Complete 5 days in a row</p>
              </div>
            </div>
          </div>
          {/* Day pips */}
          <div className="mt-4 flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((d, i) => {
              const reached = streakDays >= d;
              const today = streakDays + 1 === d || (streakDays >= d && d === streakDays);
              const isCurrent = d === streakDays;
              return (
                <div key={d} className="flex flex-col items-center gap-1.5 relative">
                  {i < 4 && <div className={`absolute top-5 left-[100%] w-[calc(100%-2px)] h-[2px] ${streakDays > d ? "bg-violet-400" : "bg-white/15"} -z-0`} style={{ width: 'calc(100% + 0px)' }} />}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center relative z-10 ${
                    isCurrent ? "bg-white text-orange-500 ring-2 ring-orange-400 shadow-lg shadow-orange-500/30" :
                    reached ? "bg-violet-500 text-white" :
                    "bg-white/10 text-white/40"
                  }`}>
                    {isCurrent ? <Flame className="h-5 w-5 fill-orange-500" /> :
                     reached ? <CheckCircle2 className="h-5 w-5" /> :
                     <Gift className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] ${reached || isCurrent ? "text-white font-bold" : "text-white/50"}`}>Day {d}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* WHITE BODY */}
      <div className="-mt-4 bg-white rounded-t-[28px] relative z-10 pt-5">
        <div className="px-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-extrabold text-[17px] text-slate-900">Daily Missions</h2>
              <p className="text-[11px] text-slate-500">Resets in <span className="text-violet-600 font-bold">14h 25m</span></p>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> Completed {completedCount}/{DAILY_MISSIONS.length}
            </span>
          </div>

          {/* Mission list */}
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            {DAILY_MISSIONS.map((m, idx) => {
              const Icon = ICONS[m.icon] ?? Calendar;
              const t = TILE[m.color] ?? TILE.primary;
              const row = progress[m.key];
              const count = row?.count ?? 0;
              const ready = count >= m.target && !row?.claimed_at;
              const claimed = !!row?.claimed_at;
              return (
                <div key={m.key} className={`px-3.5 py-3.5 flex items-center gap-3 ${idx > 0 ? "border-t border-slate-50" : ""}`}>
                  <div className={`h-12 w-12 rounded-2xl ${t.tile} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="h-6 w-6 text-white" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[14px] text-slate-900 truncate">{m.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{m.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-extrabold text-slate-900 inline-flex items-center gap-1">
                      +{m.reward} <span className="text-base">🪙</span>
                    </p>
                  </div>
                  {claimed ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 rounded-xl px-3 py-2 inline-flex items-center gap-1 flex-shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </span>
                  ) : ready ? (
                    <button onClick={() => handleClaim(m)} className="text-[11px] font-extrabold rounded-xl px-4 py-2 bg-emerald-500 text-white tap-scale flex-shrink-0 shadow-sm shadow-emerald-500/30">
                      Claim
                    </button>
                  ) : m.target > 1 ? (
                    <span className="text-[11px] font-extrabold rounded-xl px-3.5 py-2 bg-violet-50 text-violet-700 flex-shrink-0">
                      {Math.min(count, m.target)}/{m.target}
                    </span>
                  ) : (
                    <button onClick={() => routeFor(m.key, navigate)} className={`text-[11px] font-extrabold rounded-xl px-4 py-2 ${t.btn} text-white tap-scale flex-shrink-0 shadow-sm`}>
                      {m.key === "ask_ai_tutor" ? "Ask Now" : m.key === "summarize_notes" ? "Try Now" : "Start"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bonus */}
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-extrabold text-[17px] text-slate-900 inline-flex items-center gap-1.5">
              <Sparkle /> Bonus Missions
            </h2>
            <button className="text-xs font-bold text-violet-600">See All</button>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">Extra tasks, bigger rewards!</p>
          <div className="grid grid-cols-3 gap-2.5">
            {BONUS_MISSIONS.map((m) => {
              const Icon = ICONS[m.icon] ?? Trophy;
              const t = TILE[m.color] ?? TILE.primary;
              const cnt = progress[m.key]?.count ?? 0;
              const pct = Math.min(100, (cnt / m.target) * 100);
              return (
                <div key={m.key} className={`rounded-2xl ${t.bonusBg} p-3 flex flex-col gap-1.5`}>
                  <div className={`h-10 w-10 rounded-xl ${t.tile} flex items-center justify-center shadow-md`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="font-extrabold text-[12px] leading-tight mt-1 text-slate-900">{m.title}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{m.description}</p>
                  <div className="text-[10px] text-slate-700 font-bold">{cnt}/{m.target}</div>
                  <div className="w-full h-1.5 rounded-full bg-white overflow-hidden">
                    <div className={`h-full ${t.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[12px] font-extrabold text-slate-900 inline-flex items-center gap-1 mt-1">
                    +{m.reward} <span>🪙</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earn more — link to wallet to top up via Paystack */}
        <div className="px-5 mt-6">
          <button
            onClick={() => navigate("/wallet")}
            className="w-full rounded-3xl gradient-night text-white p-4 flex items-center gap-3 shadow-lg overflow-hidden relative tap-scale text-left"
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-500/30 blur-2xl rounded-full" />
            <div className="text-3xl flex-shrink-0">💰</div>
            <div className="flex-1 min-w-0 relative">
              <p className="font-extrabold text-sm">Need more coins?</p>
              <p className="text-[10px] text-white/75 mt-0.5 leading-snug">Top up securely with Paystack or finish more missions.</p>
            </div>
            <span className="bg-white text-violet-700 text-xs font-extrabold rounded-xl px-4 py-2.5 flex-shrink-0 inline-flex items-center gap-1.5 relative">
              Open Wallet
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Sparkle = () => <span className="text-amber-500">✨</span>;

function routeFor(key: string, navigate: (p: string) => void) {
  switch (key) {
    case "complete_test": navigate("/create-test"); break;
    case "ask_ai_tutor": navigate("/home"); break;
    case "summarize_notes": navigate("/upload"); break;
    case "share_quiz": navigate("/quiz-for-others"); break;
    default: navigate("/home");
  }
}

export default MissionsPage;
