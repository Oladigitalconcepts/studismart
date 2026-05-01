import { Bell, Upload, Sparkles, Target, FileText, ChevronRight } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Card } from "@/components/ui/card";

interface Props {
  onNavigate: (screen: "upload" | "studypack" | "examfocus") => void;
}

const recent = [
  { name: "Data Structures.pdf", course: "CSC 101", time: "2 hours ago", color: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300" },
  { name: "Calculus II Notes.pdf", course: "MTH 202", time: "Yesterday", color: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" },
  { name: "Physics Lecture 5.pptx", course: "PHY 103", time: "2 days ago", color: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" },
];

export const Dashboard = ({ onNavigate }: Props) => (
  <div className="animate-fade-in">
    <StatusBar />
    <div className="px-5 pt-3 pb-4 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold leading-tight">
          Good evening, Fayo <span className="inline-block animate-float">👋</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Ready to crush your goals today?</p>
      </div>
      <button className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale relative">
        <Bell className="h-5 w-5" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
      </button>
    </div>

    <div className="px-5 space-y-3">
      <button
        onClick={() => onNavigate("upload")}
        className="w-full text-left p-5 rounded-2xl gradient-hero text-white shadow-elevated tap-scale relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Upload Material</h3>
            <p className="text-white/80 text-sm mt-0.5 max-w-[180px]">
              Add lecture notes, slides or any study material
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Upload className="h-7 w-7" />
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("studypack")}
          className="p-4 rounded-2xl bg-primary-soft tap-scale text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h4 className="font-semibold text-sm text-foreground">Generate Study Pack</h4>
          <p className="text-xs text-muted-foreground mt-1">Get summaries, notes and questions</p>
        </button>

        <button
          onClick={() => onNavigate("examfocus")}
          className="p-4 rounded-2xl bg-warning/15 tap-scale text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-warning/25 flex items-center justify-center mb-3">
            <Target className="h-5 w-5 text-warning" />
          </div>
          <h4 className="font-semibold text-sm">Exam Focus</h4>
          <p className="text-xs text-muted-foreground mt-1">See important topics and weak areas</p>
        </button>
      </div>
    </div>

    <div className="mt-8 px-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-base">Recent Activity</h2>
        <button className="text-xs font-semibold text-primary tap-scale">View all</button>
      </div>
      <Card className="rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
        {recent.map((r) => (
          <button
            key={r.name}
            onClick={() => onNavigate("studypack")}
            className="w-full p-4 flex items-center gap-3 tap-scale text-left hover:bg-muted/50 transition-base"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${r.color}`}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.course} • {r.time}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </Card>
    </div>
  </div>
);
