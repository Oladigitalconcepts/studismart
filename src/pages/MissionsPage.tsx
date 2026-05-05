import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Flame, FileText, Bot, StickyNote, Share2, UserPlus, Trophy, ShieldCheck, Coins, Play, Gift, Lock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { useWallet } from "@/hooks/useWallet";
import { DAILY_MISSIONS, BONUS_MISSIONS, fetchTodayMissions, claimMission, type MissionDef, type MissionRow, triggerDailyLogin } from "@/lib/missions";
import { earn } from "@/lib/coins";
import { toast } from "@/hooks/use-toast";

const ICONS: Record<string, any> = {
  calendar: Calendar, flame: Flame, "file-text": FileText, bot: Bot, "sticky-note": StickyNote,
  "share-2": Share2, "user-plus": UserPlus, trophy: Trophy, "shield-check": ShieldCheck,
};

const COLORS: Record<string, { bg: string; fg: string; btn: string }> = {
  primary: { bg: "bg-primary-soft", fg: "text-primary", btn: "gradient-primary text-white" },
  green:   { bg: "bg-emerald-100",  fg: "text-emerald-600", btn: "bg-emerald-500 text-white" },
  blue:    { bg: "bg-blue-100",     fg: "text-blue-600", btn: "bg-blue-500 text-white" },
  amber:   { bg: "bg-amber-100",    fg: "text-amber-600", btn: "bg-amber-500 text-white" },
  pink:    { bg: "bg-pink-100",     fg: "text-pink-600", btn: "bg-pink-500 text-white" },
  teal:    { bg: "bg-teal-100",     fg: "text-teal-600", btn: "bg-teal-500 text-white" },
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
    try {
      await claimMission(m);
      toast({ title: `+${m.reward} coins`, description: `${m.title} claimed!` });
      load();
    } catch (e: any) {
      toast({ title: "Could not claim", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  const watchAd = async () => {
    if (adsWatched >= AD_LIMIT) {
      toast({ title: "Daily ad limit reached", description: "Come back tomorrow for more bonuses." });
      return;
    }
    toast({ title: "Loading ad…", description: "Demo mode — instant reward." });
    setTimeout(async () => {
      await earn(2, "watch_ad");
      const next = adsWatched + 1;
      setAdsWatched(next);
      try { localStorage.setItem(AD_KEY(), String(next)); } catch { /* noop */ }
      toast({ title: "+2 coins", description: "Thanks for watching!" });
    }, 600);
  };

  return (
    <div className="animate-fade-in pb-6">
      <StatusBar />

      {/* Hero */}
      <div className="relative px-5 pt-4 pb-6 gradient-hero text-white rounded-b-[28px] overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" />
        <div className="relative flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center tap-scale">
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <CoinBalancePill />
        </div>
        <div className="relative">
          <h1 className="font-bold text-xl leading-none">Daily Missions</h1>
          <p className="text-white/85 text-xs mt-1">Complete missions and earn coins</p>

          <div className="mt-4 rounded-2xl bg-white/15 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm inline-flex items-center gap-1.5"><Flame className="h-4 w-4 text-orange-300" /> {streakDays} Day Streak</p>
              <p className="text-[10px] text-white/85">Streak Reward · +50 🪙</p>
            </div>
            <p className="text-[11px] text-white/85 mt-1">Keep it up! {Math.max(0, 5 - streakDays)} more days to unlock bonus reward.</p>
            <div className="mt-3 flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((d) => {
                const reached = streakDays >= d;
                const today = streakDays + 1 === d;
                return (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center ${reached ? "bg-white text-primary" : today ? "bg-orange-400 text-white ring-2 ring-white" : "bg-white/15"}`}>
                      {reached ? <CheckCircle2 className="h-4 w-4" /> : today ? <Flame className="h-4 w-4" /> : <Gift className="h-4 w-4 text-white/70" />}
                    </div>
                    <span className="text-[9px] text-white/85">Day {d}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Tasks */}
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold text-base">Daily Missions</h2>
            <p className="text-[10px] text-muted-foreground">Resets in 24h</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-primary-soft text-primary text-[10px] font-bold inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Completed {completedCount}/{DAILY_MISSIONS.length}
          </span>
        </div>
        <div className="rounded-2xl bg-card border border-border divide-y divide-border">
          {DAILY_MISSIONS.map((m) => {
            const Icon = ICONS[m.icon] ?? Calendar;
            const c = COLORS[m.color] ?? COLORS.primary;
            const row = progress[m.key];
            const count = row?.count ?? 0;
            const ready = count >= m.target && !row?.claimed_at;
            const claimed = !!row?.claimed_at;
            return (
              <div key={m.key} className="px-3 py-3 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${c.fg}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{m.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.description}</p>
                </div>
                <p className="text-xs font-bold text-amber-600 inline-flex items-center gap-0.5 flex-shrink-0">
                  <Coins className="h-3 w-3" /> +{m.reward}
                </p>
                {claimed ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 rounded-full px-2.5 py-1.5 inline-flex items-center gap-1 flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </span>
                ) : ready ? (
                  <button onClick={() => handleClaim(m)} className="text-[10px] font-bold rounded-full px-3 py-1.5 bg-emerald-500 text-white tap-scale flex-shrink-0">
                    Claim
                  </button>
                ) : m.target > 1 ? (
                  <span className="text-[10px] font-bold rounded-full px-2.5 py-1.5 bg-secondary text-foreground flex-shrink-0">
                    {Math.min(count, m.target)}/{m.target}
                  </span>
                ) : (
                  <button onClick={() => routeFor(m.key, navigate)} className="text-[10px] font-bold rounded-full px-3 py-1.5 gradient-primary text-white tap-scale flex-shrink-0">
                    Start
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bonus Missions */}
      <div className="px-5 mt-5">
        <h2 className="font-bold text-base mb-2 inline-flex items-center gap-1.5">
          ✨ Bonus Missions
        </h2>
        <p className="text-[10px] text-muted-foreground -mt-1 mb-2">Extra tasks, bigger rewards!</p>
        <div className="grid grid-cols-3 gap-2">
          {BONUS_MISSIONS.map((m) => {
            const Icon = ICONS[m.icon] ?? Trophy;
            const c = COLORS[m.color] ?? COLORS.primary;
            return (
              <div key={m.key} className={`rounded-2xl p-3 ${c.bg}/50 border border-border flex flex-col items-start gap-1`}>
                <div className={`h-8 w-8 rounded-xl bg-card ${c.fg} flex items-center justify-center shadow-soft`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-bold text-[11px] leading-tight mt-1">{m.title}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{m.description}</p>
                <div className="w-full mt-1 h-1.5 rounded-full bg-card overflow-hidden">
                  <div className={`h-full ${c.btn}`} style={{ width: `${Math.min(100, ((progress[m.key]?.count ?? 0) / m.target) * 100)}%` }} />
                </div>
                <p className="text-[10px] font-bold text-amber-600 inline-flex items-center gap-0.5 mt-1">
                  <Coins className="h-2.5 w-2.5" /> +{m.reward}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Watch & Earn */}
      <div className="px-5 mt-5">
        <div className="rounded-2xl gradient-hero text-white p-4 flex items-center gap-3 shadow-elevated">
          <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
            🎁
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Watch & Earn</p>
            <p className="text-[10px] text-white/85">Watch a short video and earn 2 coins instantly! ({adsWatched}/{AD_LIMIT} today)</p>
          </div>
          <button onClick={watchAd} disabled={adsWatched >= AD_LIMIT}
            className="bg-white text-primary text-xs font-bold rounded-xl px-3 py-2 tap-scale flex-shrink-0 disabled:opacity-50 inline-flex items-center gap-1">
            <Play className="h-3 w-3 fill-primary" /> {adsWatched >= AD_LIMIT ? "Done" : "Watch Ad"}
          </button>
        </div>
      </div>
    </div>
  );
};

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
