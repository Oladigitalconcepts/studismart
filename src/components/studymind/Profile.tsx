import { Settings, Flame, Award, ChevronRight, BookOpen, Layers, CheckCircle2, HelpCircle, LogOut, Moon, Sun } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { useEffect, useState } from "react";

export const Profile = () => {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const stats = [
    { label: "Courses", value: 12, icon: BookOpen },
    { label: "Study Packs", value: 46, icon: Layers },
    { label: "Practiced", value: 128, icon: CheckCircle2 },
  ];

  const items = [
    { label: "Study Streak", value: "7 days", icon: Flame, color: "text-orange-500" },
    { label: "Achievements", value: "12 Badges", icon: Award, color: "text-amber-500" },
    { label: "Settings", icon: Settings, color: "text-primary" },
    { label: "Help & Support", icon: HelpCircle, color: "text-blue-500" },
    { label: "Log Out", icon: LogOut, color: "text-destructive" },
  ];

  return (
    <div className="animate-fade-in">
      <StatusBar />

      <div className="relative mx-5 mt-3 rounded-3xl gradient-hero p-6 text-white shadow-elevated overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <button
          onClick={() => setDark((d) => !d)}
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center tap-scale"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-2xl font-bold ring-4 ring-white/20">
            FA
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Fayo Adeyemi</h2>
            <p className="text-white/80 text-sm">Computer Science</p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-2 mt-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/15 backdrop-blur-sm p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-white/80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-2">
        {items.map((item) => (
          <button key={item.label} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale hover:shadow-card transition-base">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};
