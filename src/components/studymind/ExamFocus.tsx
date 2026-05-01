import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, AlertTriangle, TrendingUp, Activity, Loader2 } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props { onBack: () => void; onPractice: () => void; }

interface TopicStat {
  topic: string;
  total: number;
  correct: number;
  rate: number;
}

export const ExamFocus = ({ onBack, onPractice }: Props) => {
  const [score, setScore] = useState(0);
  const [topics, setTopics] = useState<TopicStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: answers } = await supabase
        .from("answer_attempts")
        .select("topic, is_correct")
        .order("created_at", { ascending: false })
        .limit(500);

      const stats = new Map<string, { total: number; correct: number }>();
      let total = 0, correct = 0;
      (answers ?? []).forEach((a) => {
        const t = a.topic ?? "General";
        const s = stats.get(t) ?? { total: 0, correct: 0 };
        s.total += 1;
        if (a.is_correct) s.correct += 1;
        stats.set(t, s);
        total += 1;
        if (a.is_correct) correct += 1;
      });

      setScore(total === 0 ? 0 : Math.round((correct / total) * 100));
      const arr = Array.from(stats.entries())
        .map(([topic, s]) => ({ topic, total: s.total, correct: s.correct, rate: s.correct / s.total }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 5);
      setTopics(arr);
      setLoading(false);
    })();
  }, []);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * (circumference * 0.75);

  const message = score >= 80 ? "You're exam ready!" : score >= 60 ? "You're getting there!" : score > 0 ? "Keep practicing." : "Practice some questions to see your readiness.";

  const iconFor = (rate: number) => rate < 0.5 ? AlertTriangle : rate < 0.75 ? TrendingUp : Activity;
  const colorFor = (rate: number) => rate < 0.5
    ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
    : rate < 0.75
      ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
      : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300";

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold">Exam Focus</h1>
        <div className="w-10" />
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="px-5 mt-4">
          <h3 className="font-bold mb-3">Overall Readiness</h3>
          <Card className="rounded-2xl p-6 flex flex-col items-center bg-gradient-to-br from-warning/10 to-primary-soft border-0 shadow-soft">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-[210deg]" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${circumference * 0.75} ${circumference}`} />
                <circle cx="90" cy="90" r={radius} fill="none" stroke="url(#warmGrad)" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                <defs>
                  <linearGradient id="warmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--warning))" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{score}%</span>
                <span className="text-xs text-muted-foreground mt-1">Ready</span>
              </div>
            </div>
            <p className="font-semibold mt-2">{message}</p>
          </Card>

          <h3 className="font-bold mt-6 mb-3">High Priority Topics</h3>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Answer some practice questions to see your weak areas.</p>
          ) : (
            <div className="space-y-2">
              {topics.map((p) => {
                const Icon = iconFor(p.rate);
                return (
                  <div key={p.topic} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorFor(p.rate)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.topic}</p>
                      <p className="text-xs text-muted-foreground">{p.correct}/{p.total} correct • {Math.round(p.rate * 100)}%</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}

          <Button onClick={onPractice} className="w-full h-12 mt-5 rounded-2xl gradient-primary tap-scale font-semibold">
            Practice Again
          </Button>
        </div>
      )}
    </div>
  );
};
