import { useEffect, useState } from "react";
import { Bell, Upload, Sparkles, Target, FileText, ChevronRight, Loader2 } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Props {
  onNavigate: (screen: "upload" | "studypack" | "examfocus") => void;
}

export const Dashboard = ({ onNavigate }: Props) => {
  const [name, setName] = useState<string>("");
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (!cancelled) setName(profile?.display_name ?? user.email?.split("@")[0] ?? "");
      const { data: mats } = await supabase
        .from("materials")
        .select("id, title, status, created_at, study_packs(id)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!cancelled) {
        setRecent(mats ?? []);
        setLoading(false);
      }
    })();
  }, []);

  const greet = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <div className="px-5 pt-3 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight">
            {greet}, {name || "there"} <span className="inline-block animate-float">👋</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ready to crush your goals today?</p>
        </div>
        <button className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale relative">
          <Bell className="h-5 w-5" />
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
          <button onClick={() => onNavigate("studypack")} className="p-4 rounded-2xl bg-primary-soft tap-scale text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h4 className="font-semibold text-sm text-foreground">Latest Study Pack</h4>
            <p className="text-xs text-muted-foreground mt-1">Summary, topics & questions</p>
          </button>

          <button onClick={() => onNavigate("examfocus")} className="p-4 rounded-2xl bg-warning/15 tap-scale text-left">
            <div className="h-10 w-10 rounded-xl bg-warning/25 flex items-center justify-center mb-3">
              <Target className="h-5 w-5 text-warning" />
            </div>
            <h4 className="font-semibold text-sm">Exam Focus</h4>
            <p className="text-xs text-muted-foreground mt-1">High-priority weak areas</p>
          </button>
        </div>
      </div>

      <div className="mt-8 px-5">
        <h2 className="font-bold text-base mb-3">Recent Activity</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : recent.length === 0 ? (
          <Card className="rounded-2xl p-5 text-center text-sm text-muted-foreground">
            No materials yet. Upload your first lecture to get started.
          </Card>
        ) : (
          <Card className="rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
            {recent.map((r) => (
              <button
                key={r.id}
                onClick={() => onNavigate("studypack")}
                className="w-full p-4 flex items-center gap-3 tap-scale text-left hover:bg-muted/50 transition-base"
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary-soft text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.status === "ready" ? "Ready" : r.status} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};
