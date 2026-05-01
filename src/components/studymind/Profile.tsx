import { useEffect, useState } from "react";
import { Settings, Flame, Award, ChevronRight, BookOpen, Layers, CheckCircle2, HelpCircle, LogOut, Moon, Sun } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { supabase } from "@/integrations/supabase/client";

export const Profile = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({ packs: 0, attempts: 0, correct: 0 });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setName(profile?.display_name ?? user.email?.split("@")[0] ?? "");

      const [{ count: packs }, { count: attempts }, { data: ans }] = await Promise.all([
        supabase.from("study_packs").select("*", { count: "exact", head: true }),
        supabase.from("practice_attempts").select("*", { count: "exact", head: true }),
        supabase.from("answer_attempts").select("is_correct"),
      ]);
      const correct = (ans ?? []).filter((a) => a.is_correct).length;
      setStats({ packs: packs ?? 0, attempts: attempts ?? 0, correct });
    })();
  }, []);

  const initials = (name || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const items = [
    { label: "Study Streak", value: "—", icon: Flame, color: "text-orange-500" },
    { label: "Achievements", value: `${Math.floor(stats.correct / 10)} badges`, icon: Award, color: "text-amber-500" },
    { label: "Settings", icon: Settings, color: "text-primary" },
    { label: "Help & Support", icon: HelpCircle, color: "text-blue-500" },
  ];

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div className="animate-fade-in">
      <StatusBar />

      <div className="relative mx-5 mt-3 rounded-3xl gradient-hero p-6 text-white shadow-elevated overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <button
          onClick={() => setDark((d) => !d)}
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center tap-scale"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-2xl font-bold ring-4 ring-white/20">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg leading-tight truncate">{name || "Student"}</h2>
            <p className="text-white/80 text-sm truncate">{email}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-2 mt-6">
          {[
            { label: "Study Packs", value: stats.packs, icon: Layers },
            { label: "Sessions", value: stats.attempts, icon: BookOpen },
            { label: "Correct", value: stats.correct, icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/15 backdrop-blur-sm p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-white/80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-2">
        {items.map((item) => (
          <button key={item.label} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
        <button
          onClick={signOut}
          className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale"
        >
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
            <LogOut className="h-5 w-5 text-destructive" />
          </div>
          <span className="flex-1 text-left text-sm font-medium">Log out</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
