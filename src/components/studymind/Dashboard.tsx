import { useEffect, useState } from "react";
import {
  Bell, Upload, Sparkles, Target, FileText, ChevronRight, Loader2,
  BookOpen, AlertTriangle, Flame, CalendarDays, Trophy, ArrowRight,
  FileCheck2, Users, Bot, Play,
} from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { computeStreak } from "@/lib/notifications";
import { toast } from "@/hooks/use-toast";

interface Props {
  onNavigate: (
    screen:
      | "upload"
      | "studypack"
      | "examfocus"
      | "profile"
      | "practice"
      | "analytics"
      | "leaderboard",
    payload?: { studyPackId?: string; topic?: string }
  ) => void;
  onOpenNotifications?: () => void;
}

interface Profile {
  display_name: string | null;
  course_code: string | null;
  level: string | null;
  exam_date: string | null;
  weekly_goal: number;
  avatar_url: string | null;
}

interface RecentItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  pack_id: string | null;
  pct: number;
}

const initialsOf = (name: string) =>
  (name || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export const Dashboard = ({ onNavigate, onOpenNotifications }: Props) => {
  const { unread } = useNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coursesCount, setCoursesCount] = useState(0);
  const [weakAreasCount, setWeakAreasCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [aiRec, setAiRec] = useState<{ topic: string; reason: string } | null>(null);
  const [progress, setProgress] = useState({
    sessionsThisWeek: 0,
    accuracy: 0,
    questionsSolved: 0,
  });
  const [rank, setRank] = useState<{ position: number; total: number } | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: prof },
        { data: ans },
        { data: mats },
        streakInfo,
        { data: lb },
        { data: weekAttempts },
      ] = await Promise.all([
        supabase.from("profiles")
          .select("display_name, course_code, level, exam_date, weekly_goal, avatar_url")
          .eq("id", user.id).maybeSingle(),
        supabase.from("answer_attempts").select("topic, is_correct"),
        supabase.from("materials")
          .select("id, title, status, created_at, study_packs(id)")
          .order("created_at", { ascending: false }).limit(8),
        computeStreak(),
        supabase.rpc("weekly_leaderboard"),
        supabase.from("practice_attempts")
          .select("finished_at")
          .gte("finished_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      if (cancelled) return;

      setProfile({
        display_name: prof?.display_name ?? user.email?.split("@")[0] ?? null,
        course_code: prof?.course_code ?? null,
        level: prof?.level ?? null,
        exam_date: prof?.exam_date ?? null,
        weekly_goal: prof?.weekly_goal ?? 5,
        avatar_url: prof?.avatar_url ?? null,
      });

      // Topic accuracy
      const topicMap = new Map<string, { c: number; t: number }>();
      let correct = 0;
      (ans ?? []).forEach((a: any) => {
        if (a.is_correct) correct++;
        const k = (a.topic ?? "General").trim() || "General";
        const cur = topicMap.get(k) ?? { c: 0, t: 0 };
        cur.t++;
        if (a.is_correct) cur.c++;
        topicMap.set(k, cur);
      });
      const total = ans?.length ?? 0;
      const weak = Array.from(topicMap.entries())
        .filter(([, v]) => v.t >= 3 && v.c / v.t < 0.7);
      setWeakAreasCount(weak.length);
      setProgress({
        sessionsThisWeek: weekAttempts?.length ?? 0,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        questionsSolved: total,
      });

      // AI recommendation: weakest topic, else inactivity nudge, else general
      if (weak.length > 0) {
        const sorted = weak.sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t);
        const [topic, v] = sorted[0];
        setAiRec({
          topic,
          reason: `Your accuracy in ${topic} is ${Math.round((v.c / v.t) * 100)}%. A focused session will help.`,
        });
      } else if (!streakInfo.studiedToday) {
        setAiRec({
          topic: "Today's session",
          reason: "Keep your momentum going with a quick practice round.",
        });
      } else if ((mats ?? []).length > 0) {
        setAiRec({
          topic: "Review your latest material",
          reason: "Reinforce what you just uploaded with a quick quiz.",
        });
      }

      // Courses = distinct materials count (proxy)
      setCoursesCount(mats?.length ?? 0);
      setStreak(streakInfo.current);

      // Leaderboard
      const board = (lb as any[]) ?? [];
      const me = board.find((r) => r.user_id === user.id);
      if (me) setRank({ position: me.rank, total: board.length });

      // Continue learning: compute progress per pack
      const packIds = (mats ?? [])
        .map((m: any) => m.study_packs?.[0]?.id)
        .filter(Boolean) as string[];

      let answeredByPack = new Map<string, Set<string>>();
      let totalByPack = new Map<string, number>();
      if (packIds.length > 0) {
        const { data: qs } = await supabase
          .from("questions")
          .select("id, study_pack_id")
          .in("study_pack_id", packIds);
        (qs ?? []).forEach((q: any) => {
          totalByPack.set(q.study_pack_id, (totalByPack.get(q.study_pack_id) ?? 0) + 1);
        });
        const qIds = (qs ?? []).map((q: any) => q.id);
        if (qIds.length > 0) {
          const { data: aa } = await supabase
            .from("answer_attempts")
            .select("question_id")
            .in("question_id", qIds);
          const qToPack = new Map<string, string>();
          (qs ?? []).forEach((q: any) => qToPack.set(q.id, q.study_pack_id));
          (aa ?? []).forEach((row: any) => {
            const p = qToPack.get(row.question_id);
            if (!p) return;
            if (!answeredByPack.has(p)) answeredByPack.set(p, new Set());
            answeredByPack.get(p)!.add(row.question_id);
          });
        }
      }

      const items: RecentItem[] = (mats ?? []).slice(0, 5).map((m: any) => {
        const packId = m.study_packs?.[0]?.id ?? null;
        const tot = packId ? totalByPack.get(packId) ?? 0 : 0;
        const done = packId ? answeredByPack.get(packId)?.size ?? 0 : 0;
        const pct = tot > 0 ? Math.min(100, Math.round((done / tot) * 100)) : 0;
        return { id: m.id, title: m.title, status: m.status, created_at: m.created_at, pack_id: packId, pct };
      });
      setRecent(items);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const greet = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  const examDays = (() => {
    if (!profile?.exam_date) return null;
    const d = new Date(profile.exam_date);
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (days < 0) return null;
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 14) return `${days} days`;
    return `${Math.ceil(days / 7)} weeks`;
  })();

  const name = profile?.display_name ?? "";
  const goalPct = Math.min(100, Math.round((progress.sessionsThisWeek / Math.max(profile?.weekly_goal ?? 5, 1)) * 100));

  const comingSoon = (label: string) =>
    toast({ title: `${label} — coming soon`, description: "We're polishing this feature." });

  return (
    <div className="animate-fade-in pb-2">
      <StatusBar />

      {/* Top brand row */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center shadow-soft">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">StudyMind</span>
        </div>
        <button
          onClick={onOpenNotifications}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: Identity card */}
      <div className="px-5">
        <button
          onClick={() => onNavigate("profile")}
          className="w-full text-left rounded-2xl bg-card border border-border shadow-soft p-4 tap-scale"
        >
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span>{initialsOf(name)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{greet},</p>
              <p className="font-bold text-base leading-tight truncate">
                {name || "Student"} <span className="inline-block animate-float">👋</span>
              </p>
              {(profile?.level || profile?.course_code) && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {[profile?.level, profile?.course_code].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>

          <div className={`mt-3 grid gap-2 ${examDays ? "grid-cols-4" : "grid-cols-3"}`}>
            <Stat icon={BookOpen} color="text-primary" bg="bg-primary-soft" label="Courses" value={coursesCount} />
            <Stat icon={AlertTriangle} color="text-warning" bg="bg-warning/15" label="Weak Areas" value={weakAreasCount} />
            <Stat icon={Flame} color="text-orange-500" bg="bg-orange-500/15" label="Day Streak" value={streak} />
            {examDays && (
              <Stat icon={CalendarDays} color="text-blue-500" bg="bg-blue-500/15" label="Exam in" value={examDays} small />
            )}
          </div>
        </button>
      </div>

      {/* SECTION 2: AI Recommendation */}
      {aiRec && (
        <div className="px-5 mt-4">
          <div className="relative rounded-2xl gradient-hero text-white p-5 shadow-elevated overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold tracking-wider">
                <Sparkles className="h-3 w-3" /> AI RECOMMENDATION
              </div>
              <p className="text-white/90 text-sm mt-3">Focus on your weak area:</p>
              <h3 className="font-bold text-xl leading-tight mt-1">{aiRec.topic}</h3>
              <p className="text-white/85 text-xs mt-1.5 max-w-[260px]">{aiRec.reason}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onNavigate("practice", { topic: aiRec.topic })}
                  className="flex-1 bg-white text-primary font-semibold text-sm rounded-xl py-2.5 px-3 tap-scale flex items-center justify-center gap-1"
                >
                  Start Practice <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => comingSoon("AI Tutor")}
                  className="flex-1 bg-white/15 backdrop-blur border border-white/30 text-white font-semibold text-sm rounded-xl py-2.5 px-3 tap-scale flex items-center justify-center gap-1.5"
                >
                  Ask AI Tutor <Bot className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Quick Actions */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={Upload} title="Upload Material" subtitle="Notes, slides, PDFs & more"
            color="text-primary" bg="bg-primary-soft" onClick={() => onNavigate("upload")}
          />
          <QuickAction
            icon={FileCheck2} title="Create Test" subtitle="Coming soon"
            color="text-blue-500" bg="bg-blue-500/10" onClick={() => comingSoon("Create Test")}
          />
          <QuickAction
            icon={Users} title="Quiz for Others" subtitle="Coming soon"
            color="text-orange-500" bg="bg-orange-500/10" onClick={() => comingSoon("Quiz for Others")}
          />
          <QuickAction
            icon={Bot} title="AI Tutor" subtitle="Coming soon"
            color="text-emerald-500" bg="bg-emerald-500/10" onClick={() => comingSoon("AI Tutor")}
          />
        </div>
      </div>

      {/* SECTION 4: Progress */}
      <div className="px-5 mt-5">
        <Card className="rounded-2xl border-border shadow-soft p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">Your Progress</h2>
            <button
              onClick={() => onNavigate("analytics")}
              className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 tap-scale"
            >
              View Progress <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <ProgressBar
              label="Weekly Goal"
              value={`${progress.sessionsThisWeek} / ${profile?.weekly_goal ?? 5}`}
              percent={goalPct}
              barClass="gradient-primary"
            />
            <ProgressBar
              label="Accuracy"
              value={`${progress.accuracy}%`}
              percent={progress.accuracy}
              barClass="bg-success"
            />
            <ProgressBar
              label="Solved"
              value={`${progress.questionsSolved}`}
              percent={Math.min(100, progress.questionsSolved / 2)}
              barClass="bg-blue-500"
            />
          </div>
        </Card>
      </div>

      {/* SECTION 5: Weekly Challenge */}
      <div className="px-5 mt-4">
        <button
          onClick={() => onNavigate("leaderboard")}
          className="w-full text-left rounded-2xl bg-warning/10 border border-warning/30 p-4 tap-scale"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-warning/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-6 w-6 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">Weekly Challenge</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Compete with other students and climb the leaderboard.
              </p>
            </div>
            <div className="text-right">
              {rank ? (
                <>
                  <p className="text-[10px] text-muted-foreground">Your Rank</p>
                  <p className="font-bold text-base text-warning leading-none">#{rank.position}</p>
                  {rank.total > 0 && (
                    <p className="text-[10px] text-warning/80 mt-0.5">
                      Top {Math.max(1, Math.round((rank.position / rank.total) * 100))}%
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] font-semibold text-primary">Join</p>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* SECTION 6: Continue Learning */}
      <div className="px-5 mt-5">
        <h2 className="font-bold text-base mb-2">Continue Learning</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : recent.length === 0 ? (
          <Card className="rounded-2xl p-5 text-center text-sm text-muted-foreground">
            No materials yet. Upload your first lecture to get started.
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <button
                key={r.id}
                onClick={() => r.pack_id && onNavigate("studypack", { studyPackId: r.pack_id })}
                className="w-full p-3 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full gradient-primary" style={{ width: `${r.pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {r.status === "ready" ? `${r.pct}% completed` : r.status}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-primary-soft text-primary text-[11px] font-semibold inline-flex items-center gap-1 flex-shrink-0">
                  Resume <Play className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({
  icon: Icon, color, bg, label, value, small,
}: { icon: any; color: string; bg: string; label: string; value: number | string; small?: boolean }) => (
  <div className="flex items-center gap-2 min-w-0">
    <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <div className="min-w-0">
      <p className={`font-bold leading-none ${small ? "text-xs" : "text-base"}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{label}</p>
    </div>
  </div>
);

const QuickAction = ({
  icon: Icon, title, subtitle, color, bg, onClick,
}: { icon: any; title: string; subtitle: string; color: string; bg: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-2xl ${bg} tap-scale text-left relative`}
  >
    <div className={`h-9 w-9 rounded-xl bg-card flex items-center justify-center mb-2 shadow-soft`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <h4 className="font-semibold text-sm leading-tight">{title}</h4>
    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
    <ArrowRight className={`absolute bottom-3 right-3 h-4 w-4 ${color}`} />
  </button>
);

const ProgressBar = ({
  label, value, percent, barClass,
}: { label: string; value: string; percent: number; barClass: string }) => (
  <div>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="font-bold text-sm mt-0.5">{value}</p>
    <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full ${barClass} transition-all`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  </div>
);
