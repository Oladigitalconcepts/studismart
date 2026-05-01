import { ArrowLeft, ChevronRight, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props { onBack: () => void; onPractice: () => void; }

const priorities = [
  { topic: "Trees", note: "Review recommended", icon: AlertTriangle, color: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300" },
  { topic: "Graphs", note: "Needs more practice", icon: TrendingUp, color: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" },
  { topic: "Sorting Algorithms", note: "Almost there", icon: Activity, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" },
];

export const ExamFocus = ({ onBack, onPractice }: Props) => {
  const score = 65;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * (circumference * 0.75);

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

      <div className="px-5 mt-4">
        <h3 className="font-bold mb-3">Overall Readiness</h3>
        <Card className="rounded-2xl p-6 flex flex-col items-center bg-gradient-to-br from-warning/10 to-primary-soft border-0 shadow-soft">
          <div className="relative w-44 h-44">
            <svg className="w-full h-full -rotate-[210deg]" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${circumference * 0.75} ${circumference}`} />
              <circle cx="90" cy="90" r={radius} fill="none" stroke="url(#warmGrad)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeDashoffset={offset / 1} 
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
          <p className="font-semibold mt-2">You're getting there!</p>
          <p className="text-xs text-muted-foreground">Keep focusing on weak areas.</p>
        </Card>

        <h3 className="font-bold mt-6 mb-3">High Priority Topics</h3>
        <div className="space-y-2">
          {priorities.map((p) => (
            <button key={p.topic} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale text-left hover:shadow-card transition-base">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${p.color}`}>
                <p.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{p.topic}</p>
                <p className="text-xs text-muted-foreground">{p.note}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <Button onClick={onPractice} className="w-full h-12 mt-5 rounded-2xl gradient-primary tap-scale font-semibold">
          Focus on Weak Areas
        </Button>
      </div>
    </div>
  );
};
