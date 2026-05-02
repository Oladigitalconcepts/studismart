import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, Target, BookOpen, Clock, Flame, AlertTriangle } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { computeStreak } from "@/lib/notifications";
import { Loader2 } from "lucide-react";

interface Props { onBack: () => void }

export const Analytics = ({ onBack }: Props) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    accuracy: 0,
    correct: 0,
    total: 0,
    sessions: 0,
    minutes: 0,
    streak: 0,
    longest: 0,
    weeklyGoal: 5,
    sessionsThisWeek: 0,
    perDay: [] as { day: string; sessions: number }[],
    topics: [] as { topic: string; correct: number; total: number; pct: number }[],
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const sinceWeek = new Date(Date.now() - 7 * 86400000).toISOString();
      const [
        { data: prof },
        { data: ans },
        { data: pa },
        streakInfo,
        { data: weekPa },
      ] = await Promise.all([
        supabase.from("profiles").select("weekly_goal").eq("id", user.id).maybeSingle(),
        supabase.from("answer_attempts").select("topic, is_correct"),
        supabase.from("practice_attempts").select("duration_seconds, finished_at"),
        computeStreak(),
        supabase.from("practice_attempts").select("finished_at").gte("finished_at", sinceWeek),
      ]);

      const total = ans?.length ?? 0;
      const correct = (ans ?? []).filter((a: any) => a.is_correct).length;
      const minutes = Math.round((pa ?? []).reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0) / 60);

      const topicMap = new Map<string, { c: number; t: number }>();
      (ans ?? []).forEach((a: any) => {
        const k = (a.topic ?? "General").trim() || "General";
        const cur = topicMap.get(k) ?? { c: 0, t: 0 };
        cur.t++;
        if (a.is_correct) cur.c++;
        topicMap.set(k, cur);
      });
      const topics = Array.from(topicMap.entries())
        .map(([topic, v]) => ({ topic, correct: v.c, total: v.t, pct: Math.round((v.c / v.t) * 100) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      // last 7 days bars
      const days: { day: string; sessions: number }[] = [];
      const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() - i);
        const next = new Date(d); next.setDate(d.getDate()+1);
        const count = (pa ?? []).filter((r: any) => {
          const t = new Date(r.finished_at).getTime();
          return t >= d.getTime() && t < next.getTime();
        }).length;
        days.push({ day: labels[d.getDay()], sessions: count });
      }

      setData({
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        correct,
        total,
        sessions: pa?.length ?? 0,
        minutes,
        streak: streakInfo.current,
        longest: streakInfo.longest,
        weeklyGoal: prof?.weekly_goal ?? 5,
        sessionsThisWeek: weekPa?.length ?? 0,
        perDay: days,
        topics,
      });
      setLoading(false);
    })();
  }, []);

  const maxDay = Math.max(1, ...data.perDay.map((d) => d.sessions));

  return (
    <div className="animate-fade-in pb-4">
      <StatusBar />
      <div className="flex items-center px-5 pt-2 pb-3 relative">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-base">Your Progress</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="px-5 space-y-4">
          <Card className="rounded-2xl p-4 grid grid-cols-2 gap-3">
            <Metric icon={Target} color="text-success" bg="bg-success/15" label="Accuracy" value={`${data.accuracy}%`} />
            <Metric icon={BookOpen} color="text-primary" bg="bg-primary-soft" label="Questions" value={`${data.correct}/${data.total}`} />
            <Metric icon={Clock} color="text-blue-500" bg="bg-blue-500/15" label="Study Time" value={`${data.minutes}m`} />
            <Metric icon={Flame} color="text-orange-500" bg="bg-orange-500/15" label="Streak" value={`${data.streak} days`} />
          </Card>

          <Card className="rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Weekly Goal</h3>
              <span className="text-xs text-muted-foreground">{data.sessionsThisWeek} / {data.weeklyGoal}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: `${Math.min(100, (data.sessionsThisWeek/Math.max(data.weeklyGoal,1))*100)}%` }} />
            </div>
          </Card>

          <Card className="rounded-2xl p-4">
            <h3 className="font-semibold text-sm mb-3">Last 7 days</h3>
            <div className="flex items-end justify-between gap-2 h-28">
              {data.perDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-t-md gradient-primary transition-all" style={{ height: `${(d.sessions/maxDay)*100}%`, minHeight: 4 }} />
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl p-4">
            <h3 className="font-semibold text-sm mb-3">Topic Accuracy</h3>
            {data.topics.length === 0 ? (
              <p className="text-xs text-muted-foreground">Complete more practice to see topic breakdowns.</p>
            ) : (
              <div className="space-y-3">
                {data.topics.map((t) => {
                  const weak = t.total >= 3 && t.pct < 70;
                  return (
                    <div key={t.topic}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium truncate flex items-center gap-1">
                          {weak && <AlertTriangle className="h-3 w-3 text-warning" />}
                          {t.topic}
                        </span>
                        <span className="text-muted-foreground">{t.correct}/{t.total} • {t.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full ${weak ? "bg-warning" : "bg-success"}`} style={{ width: `${t.pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Longest Streak</p>
              <p className="text-xs text-muted-foreground">{data.longest} days</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const Metric = ({ icon: Icon, color, bg, label, value }: any) => (
  <div className="flex items-center gap-2">
    <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  </div>
);
