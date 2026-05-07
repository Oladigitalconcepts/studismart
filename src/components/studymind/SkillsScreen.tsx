import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Star, Sparkles, Trophy, BookOpen, Clock, Bot, Palette, Code, BarChart3, Mic, BookOpenCheck, Menu, GraduationCap, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { InsufficientCoinsModal } from "@/components/studymind/InsufficientCoinsModal";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { spend, COSTS } from "@/lib/coins";
import { toast } from "@/hooks/use-toast";

interface Skill {
  id: string; slug: string; title: string; description: string; icon: string;
  color: string; level: string; lessons_count: number; cost_coins: number;
  popular: boolean; rating: number; sort_order: number;
}
interface UserSkill { skill_id: string; completed_lessons: number; }

const ICON_MAP: Record<string, any> = {
  palette: Palette, code: Code, "bar-chart-3": BarChart3, mic: Mic,
  bot: Bot, "book-open": BookOpenCheck, sparkles: Sparkles,
};

// Unified neutral cards with a single tinted icon tile per category.
// Reduces color competition; relies on violet as the only accent for actions.
const TILE_THEME: Record<string, string> = {
  primary: "bg-violet-500",
  green:   "bg-emerald-500",
  orange:  "bg-orange-500",
  blue:    "bg-blue-500",
  amber:   "bg-amber-500",
  pink:    "bg-pink-500",
};

export const SkillsScreen = () => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<Record<string, UserSkill>>({});
  const [loading, setLoading] = useState(true);
  const [showLowCoins, setShowLowCoins] = useState(false);
  const [stats, setStats] = useState({ enrolled: 0, lessonsDone: 0, badges: 0, minutes: 0 });
  const [profileName, setProfileName] = useState("");

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: sk }, { data: us }, { data: prof }] = await Promise.all([
      supabase.from("skills").select("*").order("sort_order"),
      supabase.from("user_skills").select("skill_id, completed_lessons").eq("user_id", user.id),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    ]);
    const map: Record<string, UserSkill> = {};
    (us ?? []).forEach((r: any) => { map[r.skill_id] = r; });
    setSkills((sk ?? []) as Skill[]);
    setUserSkills(map);
    setProfileName(prof?.display_name ?? "Student");
    const enrolled = Object.keys(map).length;
    const lessonsDone = Object.values(map).reduce((s, r) => s + r.completed_lessons, 0);
    setStats({ enrolled, lessonsDone, badges: lessonsDone >= 10 ? 5 : Math.floor(lessonsDone / 2), minutes: lessonsDone * 10 });
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const onUpd = () => fetchAll();
    window.addEventListener("wallet-updated", onUpd);
    return () => window.removeEventListener("wallet-updated", onUpd);
  }, []);

  const overallProgress = useMemo(() => {
    const totalLessons = skills.reduce((s, sk) => s + (userSkills[sk.id] ? sk.lessons_count : 0), 0);
    if (totalLessons === 0) return 65;
    return Math.round((stats.lessonsDone / totalLessons) * 100);
  }, [skills, userSkills, stats.lessonsDone]);

  const handleStart = async (skill: Skill) => {
    const owned = !!userSkills[skill.id];
    if (owned) { navigate(`/skills/${skill.slug}`); return; }
    if ((wallet?.coins ?? 0) < skill.cost_coins) { setShowLowCoins(true); return; }
    try {
      await spend("unlock_skill", { skill_id: skill.id, slug: skill.slug });
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("user_skills").insert({ user_id: user!.id, skill_id: skill.id });
      toast({ title: "Skill unlocked!", description: `Enjoy your ${skill.title} journey.` });
      await fetchAll();
      navigate(`/skills/${skill.slug}`);
    } catch (e: any) {
      toast({ title: "Could not unlock", description: e?.message ?? "Try again.", variant: "destructive" });
    }
  };

  const inProgress = skills.filter((s) => userSkills[s.id]);
  const lastInProgress = inProgress[0];
  const recommended = skills.find((s) => !userSkills[s.id]) ?? skills[0];
  const streakDays = wallet?.streak_days ?? 0;

  return (
    <div className="animate-fade-in pb-28 bg-slate-50 min-h-screen safe-bottom">
      <StatusBar tone="night" />

      {/* HERO */}
      <div className="relative gradient-night text-white px-6 pt-4 pb-10 overflow-hidden safe-top rounded-b-[32px]">
        <div className="absolute -right-16 -top-20 w-72 h-72 bg-violet-500/20 blur-3xl rounded-full" />
        <div className="absolute -left-20 top-24 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full" />

        {/* Top row */}
        <div className="relative flex items-center justify-between gap-3">
          <button onClick={() => navigate("/home")} className="h-10 w-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center tap-scale border border-white/10">
            <Menu className="h-[18px] w-[18px] text-white" />
          </button>
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40 flex-shrink-0">
              <GraduationCap className="h-[18px] w-[18px] text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[18px] leading-tight tracking-tight">Skills</h1>
              <p className="text-white/60 text-[11px] leading-none mt-1">Build your future</p>
            </div>
          </div>
          <CoinBalancePill />
        </div>

        {/* Progress card — slimmer, calmer */}
        <div className="relative mt-7 rounded-3xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-4 flex items-center gap-4">
          <CircularProgress percent={overallProgress} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] leading-tight truncate">Keep going, {profileName.split(" ")[0]}</p>
            <p className="text-[11px] text-white/60 mt-1 leading-snug">
              Finish a lesson today to earn <span className="text-amber-300 font-semibold">5 coins</span>
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold">
              🔥 {streakDays || 0}<span className="text-white/60 font-normal ml-0.5">day streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="pt-7 space-y-8">
        {/* FEATURED */}
        <section className="px-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[18px] text-slate-900 tracking-tight">Featured Skills</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">Curated to start your journey</p>
            </div>
            <button className="text-[12px] font-semibold text-violet-600 inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[210px] rounded-3xl bg-slate-100 animate-pulse" />
            )) : skills.map((s) => {
              const Icon = ICON_MAP[s.icon] ?? Sparkles;
              const tile = TILE_THEME[s.color] ?? TILE_THEME.primary;
              const us = userSkills[s.id];
              const pct = us ? Math.round((us.completed_lessons / Math.max(s.lessons_count, 1)) * 100) : 0;
              return (
                <div key={s.id} className="rounded-3xl bg-white p-4 flex flex-col border border-slate-100 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between">
                    <div className={`h-11 w-11 rounded-2xl ${tile} flex items-center justify-center`}>
                      <Icon className="h-[20px] w-[20px] text-white" strokeWidth={2.4} />
                    </div>
                    {s.popular && (
                      <span className="text-[10px] font-semibold text-orange-600">🔥</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[14px] leading-snug mt-4 text-slate-900 line-clamp-2">{s.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">{s.description}</p>

                  <div className="mt-3">
                    <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {s.rating}
                    </div>
                    <button
                      onClick={() => handleStart(s)}
                      className="text-[11px] font-semibold rounded-full px-3 py-1.5 text-white tap-scale bg-violet-600 hover:bg-violet-700 transition-colors"
                    >
                      {userSkills[s.id] ? "Continue" : "Start"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RECOMMENDED */}
        {recommended && (
          <section className="px-5">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="font-semibold text-[18px] text-slate-900 tracking-tight inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Recommended
                </h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Picked for your goals</p>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] p-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-slate-900 inline-flex items-center gap-2">
                    {recommended.title}
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">New</span>
                  </p>
                  <p className="text-[12px] text-slate-500 mt-1 leading-snug line-clamp-2">{recommended.description}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {recommended.lessons_count} Lessons</span>
                  <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {recommended.level}</span>
                </div>
                <button
                  onClick={() => handleStart(recommended)}
                  className="bg-violet-600 hover:bg-violet-700 transition-colors text-white text-[12px] font-semibold rounded-full px-4 py-2 flex-shrink-0 tap-scale"
                >
                  Start · 🪙 {recommended.cost_coins}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CONTINUE LEARNING */}
        <section className="px-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[18px] text-slate-900 tracking-tight">Continue Learning</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">Pick up where you left off</p>
            </div>
          </div>
          {(() => {
            const target = lastInProgress ?? skills[0];
            if (!target) return null;
            const tile = TILE_THEME[target.color] ?? TILE_THEME.primary;
            const us = userSkills[target.id];
            const completed = us?.completed_lessons ?? 0;
            const pct = Math.min(100, Math.round((completed / Math.max(target.lessons_count, 1)) * 100));
            const Icon = ICON_MAP[target.icon] ?? Sparkles;
            return (
              <button onClick={() => navigate(`/skills/${target.slug}`)} className="w-full text-left rounded-3xl bg-white border border-slate-100 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] p-4 tap-scale flex items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl ${tile} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] text-slate-900 truncate">{target.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 tabular-nums">{pct}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Lesson {completed} of {target.lessons_count}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </button>
            );
          })()}
        </section>

        {/* STATS */}
        <section className="px-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[18px] text-slate-900 tracking-tight">Your Progress</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">Track your learning journey</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={BookOpen}     value={stats.enrolled}      label="Skills Enrolled" />
            <StatTile icon={CheckCircle2} value={stats.lessonsDone}   label="Lessons Done" />
            <StatTile icon={Trophy}       value={stats.badges}        label="Badges Earned" />
            <StatTile icon={Clock}        value={`${stats.minutes}m`} label="Time Spent" />
          </div>
        </section>

        {/* LEARN MORE EARN MORE */}
        <section className="px-5">
          <div className="rounded-3xl gradient-night text-white p-5 flex items-center gap-4 shadow-lg overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-500/30 blur-2xl rounded-full" />
            <div className="text-3xl flex-shrink-0 relative">🎁</div>
            <div className="flex-1 min-w-0 relative">
              <p className="font-semibold text-[14px]">Learn More, Earn More</p>
              <p className="text-[11px] text-white/65 mt-1 leading-snug">Complete a lesson today to earn <span className="text-amber-300 font-semibold">5 coins</span></p>
            </div>
            <button onClick={() => navigate("/missions")} className="bg-white text-violet-700 text-[11px] font-semibold rounded-full px-3.5 py-2 tap-scale flex-shrink-0 inline-flex items-center gap-1 relative">
              Tasks <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </section>
      </div>

      <InsufficientCoinsModal
        open={showLowCoins} onOpenChange={setShowLowCoins}
        cost={COSTS.unlock_skill} balance={wallet?.coins ?? 0} action="unlock this skill"
      />
    </div>
  );
};

const CircularProgress = ({ percent }: { percent: number }) => {
  const r = 26; const c = 2 * Math.PI * r; const off = c - (percent / 100) * c;
  return (
    <div className="relative h-[68px] w-[68px] flex-shrink-0">
      <svg className="-rotate-90" width="68" height="68">
        <circle cx="34" cy="34" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="none" />
        <circle cx="34" cy="34" r={r} stroke="url(#sg)" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="font-bold text-[16px] leading-none">{percent}<span className="text-[9px] align-top font-semibold">%</span></p>
      </div>
    </div>
  );
};

const StatTile = ({ icon: Icon, value, label }: { icon: any; value: number | string; label: string }) => (
  <div className="rounded-2xl bg-white border border-slate-100 p-4 flex items-center gap-3 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]">
    <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
      <Icon className="h-[18px] w-[18px] text-violet-600" strokeWidth={2.2} />
    </div>
    <div className="min-w-0">
      <p className="font-bold text-[18px] leading-none text-slate-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1 truncate">{label}</p>
    </div>
  </div>
);
