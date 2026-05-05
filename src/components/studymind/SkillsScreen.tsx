import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Star, Flame, Sparkles, Trophy, BookOpen, Award, Clock, Bot, Palette, Code, BarChart3, Mic, BookOpenCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { InsufficientCoinsModal } from "@/components/studymind/InsufficientCoinsModal";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { spend, COSTS } from "@/lib/coins";
import { toast } from "@/hooks/use-toast";

interface Skill {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  level: string;
  lessons_count: number;
  cost_coins: number;
  popular: boolean;
  rating: number;
  sort_order: number;
}

interface UserSkill {
  skill_id: string;
  completed_lessons: number;
}

const ICON_MAP: Record<string, any> = {
  palette: Palette, code: Code, "bar-chart-3": BarChart3, mic: Mic,
  bot: Bot, "book-open": BookOpenCheck, sparkles: Sparkles,
};

const COLOR_MAP: Record<string, { bg: string; fg: string; bar: string }> = {
  primary: { bg: "bg-primary-soft",      fg: "text-primary",       bar: "gradient-primary" },
  green:   { bg: "bg-emerald-100",       fg: "text-emerald-600",   bar: "bg-emerald-500" },
  orange:  { bg: "bg-orange-100",        fg: "text-orange-600",    bar: "bg-orange-500" },
  blue:    { bg: "bg-blue-100",          fg: "text-blue-600",      bar: "bg-blue-500" },
  amber:   { bg: "bg-amber-100",         fg: "text-amber-600",     bar: "bg-amber-500" },
  pink:    { bg: "bg-pink-100",          fg: "text-pink-600",      bar: "bg-pink-500" },
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
    setStats({
      enrolled,
      lessonsDone,
      badges: lessonsDone >= 10 ? 5 : Math.floor(lessonsDone / 2),
      minutes: lessonsDone * 10,
    });
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
    if (totalLessons === 0) return 0;
    return Math.round((stats.lessonsDone / totalLessons) * 100);
  }, [skills, userSkills, stats.lessonsDone]);

  const handleStart = async (skill: Skill) => {
    const owned = !!userSkills[skill.id];
    if (owned) {
      navigate(`/skills/${skill.slug}`);
      return;
    }
    if ((wallet?.coins ?? 0) < skill.cost_coins) {
      setShowLowCoins(true);
      return;
    }
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
  const recommended = skills.find((s) => !userSkills[s.id]);

  return (
    <div className="animate-fade-in pb-6">
      <StatusBar />

      {/* HERO with gradient header */}
      <div className="relative -mt-2 px-5 pt-4 pb-6 gradient-hero text-white rounded-b-[28px] overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" />
        <div className="relative flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center backdrop-blur tap-scale">
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <CoinBalancePill />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none">Skill Learning</h1>
              <p className="text-white/85 text-xs mt-1">Learn new skills. Build your future 🚀</p>
            </div>
          </div>

          {/* Progress card */}
          <div className="mt-5 rounded-2xl bg-white/15 backdrop-blur p-4 flex items-center gap-4">
            <CircularProgress percent={overallProgress} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">Keep going, {profileName}</p>
              <p className="text-[11px] text-white/85 mt-1 leading-snug">
                Complete a lesson today and earn <span className="font-bold">2 coins</span>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-300" />
                <span className="font-bold text-base">{wallet?.streak_days ?? 0}</span>
              </div>
              <p className="text-[9px] text-white/80">Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED SKILLS */}
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Featured Skills</h2>
          <button className="text-xs font-semibold text-primary inline-flex items-center">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex gap-3 -mx-5 px-5 overflow-x-auto no-scrollbar pb-2 snap-x">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[170px] h-[210px] rounded-2xl bg-secondary animate-pulse snap-start" />
            ))
          ) : skills.map((s) => {
            const Icon = ICON_MAP[s.icon] ?? Sparkles;
            const c = COLOR_MAP[s.color] ?? COLOR_MAP.primary;
            const us = userSkills[s.id];
            const pct = us ? Math.round((us.completed_lessons / Math.max(s.lessons_count, 1)) * 100) : 0;
            return (
              <div key={s.id} className="min-w-[170px] rounded-2xl bg-card border border-border p-3 snap-start shadow-soft flex flex-col">
                {s.popular && (
                  <div className="self-end mb-1 inline-flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-100 rounded-full px-2 py-0.5">
                    <Flame className="h-2.5 w-2.5" /> Popular
                  </div>
                )}
                <div className={`h-12 w-12 rounded-2xl ${c.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`h-6 w-6 ${c.fg}`} />
                </div>
                <h3 className="font-bold text-sm leading-tight">{s.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">{s.description}</p>
                {us && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full ${c.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">{pct}%</p>
                  </div>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-foreground">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {s.rating}
                  </div>
                  <button
                    onClick={() => handleStart(s)}
                    className={`text-[11px] font-bold rounded-full px-3 py-1.5 tap-scale ${us ? c.bar + " text-white" : "gradient-primary text-white"}`}
                  >
                    {us ? "Continue" : "Start"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECOMMENDED */}
      {recommended && (
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-base inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" /> Recommended for You
            </h2>
            <button className="text-xs font-semibold text-primary">See all</button>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-200 flex items-center justify-center flex-shrink-0">
              <Bot className="h-6 w-6 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{recommended.title} <span className="ml-1 text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full align-middle">New</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{recommended.description}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {recommended.lessons_count} Lessons</span>
                <span className="inline-flex items-center gap-1"><Award className="h-3 w-3" /> {recommended.level}</span>
              </div>
            </div>
            <button onClick={() => handleStart(recommended)} className="gradient-primary text-white text-xs font-bold rounded-xl px-3 py-2 tap-scale flex-shrink-0">
              Start Learning
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-right mt-1">Unlock for {recommended.cost_coins} coins</p>
        </div>
      )}

      {/* CONTINUE LEARNING */}
      {lastInProgress && (
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-base">Continue Learning</h2>
          </div>
          {(() => {
            const c = COLOR_MAP[lastInProgress.color] ?? COLOR_MAP.primary;
            const us = userSkills[lastInProgress.id]!;
            const pct = Math.round((us.completed_lessons / Math.max(lastInProgress.lessons_count, 1)) * 100);
            const Icon = ICON_MAP[lastInProgress.icon] ?? Sparkles;
            return (
              <button onClick={() => navigate(`/skills/${lastInProgress.slug}`)} className="w-full text-left rounded-2xl bg-card border border-border p-4 tap-scale flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-6 w-6 ${c.fg}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">{lastInProgress.title}</p>
                  <p className="font-bold text-sm">Lesson {us.completed_lessons + 1} of {lastInProgress.lessons_count}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full ${c.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-primary font-bold">{pct}%</p>
                  <p className="text-[9px] text-muted-foreground inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> 15 min</p>
                </div>
              </button>
            );
          })()}
        </div>
      )}

      {/* STATS GRID */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base">Your Skill Progress</h2>
          <button className="text-xs font-semibold text-primary">View achievements</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile color="primary" icon={BookOpen} value={stats.enrolled} label="Skills Enrolled" sub="Keep learning!" />
          <StatTile color="green"   icon={BookOpenCheck} value={stats.lessonsDone} label="Lessons Completed" sub="You're consistent!" />
          <StatTile color="amber"   icon={Trophy} value={stats.badges} label="Badges Earned" sub="Amazing work!" />
          <StatTile color="blue"    icon={Clock} value={`${Math.max(stats.minutes, 0)}m`} label="Time Spent" sub="Keep it up!" />
        </div>
      </div>

      {/* LEARN MORE EARN MORE banner */}
      <div className="px-5 mt-5">
        <div className="rounded-2xl gradient-hero text-white p-4 flex items-center gap-3 shadow-elevated">
          <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
            🎁
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Learn More, Earn More!</p>
            <p className="text-[10px] text-white/85">Complete daily skill tasks and earn coins</p>
          </div>
          <button onClick={() => navigate("/missions")} className="bg-white text-primary text-xs font-bold rounded-xl px-3 py-2 tap-scale flex-shrink-0">
            See Daily Tasks
          </button>
        </div>
      </div>

      <InsufficientCoinsModal
        open={showLowCoins}
        onOpenChange={setShowLowCoins}
        cost={COSTS.unlock_skill}
        balance={wallet?.coins ?? 0}
        action="unlock this skill"
      />
    </div>
  );
};

const CircularProgress = ({ percent }: { percent: number }) => {
  const r = 28;
  const c = 2 * Math.PI * r;
  const off = c - (percent / 100) * c;
  return (
    <div className="relative h-[72px] w-[72px] flex-shrink-0">
      <svg className="-rotate-90" width="72" height="72">
        <circle cx="36" cy="36" r={r} stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
        <circle cx="36" cy="36" r={r} stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-bold text-base leading-none">{percent}<span className="text-[9px] align-top">%</span></p>
        <p className="text-[8px] text-white/80 mt-0.5">Progress</p>
      </div>
    </div>
  );
};

const StatTile = ({ color, icon: Icon, value, label, sub }: { color: keyof typeof COLOR_MAP; icon: any; value: number | string; label: string; sub: string }) => {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-2xl ${c.bg}/60 p-3 flex items-center gap-3`}>
      <div className={`h-10 w-10 rounded-xl bg-card flex items-center justify-center flex-shrink-0 shadow-soft`}>
        <Icon className={`h-5 w-5 ${c.fg}`} />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-base leading-none">{value}</p>
        <p className="text-[10px] font-semibold mt-0.5 leading-tight">{label}</p>
        <p className="text-[9px] text-muted-foreground leading-tight">{sub}</p>
      </div>
    </div>
  );
};
