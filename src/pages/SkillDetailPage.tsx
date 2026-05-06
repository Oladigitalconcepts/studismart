import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Coins, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { supabase } from "@/integrations/supabase/client";
import { earn } from "@/lib/coins";
import { toast } from "@/hooks/use-toast";

interface Lesson { id: string; position: number; title: string; body: string; duration_min: number; xp_reward: number; coin_reward: number; }
interface Skill { id: string; title: string; description: string; lessons_count: number; }

const SkillDetailPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completed, setCompleted] = useState(0);
  const [active, setActive] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!slug) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: sk } = await supabase.from("skills").select("id,title,description,lessons_count").eq("slug", slug).maybeSingle();
    if (!sk) { setLoading(false); return; }
    setSkill(sk as Skill);
    const [{ data: ls }, { data: us }] = await Promise.all([
      supabase.from("skill_lessons").select("*").eq("skill_id", sk.id).order("position"),
      supabase.from("user_skills").select("completed_lessons").eq("user_id", user.id).eq("skill_id", sk.id).maybeSingle(),
    ]);
    setLessons((ls ?? []) as Lesson[]);
    setCompleted(us?.completed_lessons ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  const completeLesson = async (l: Lesson) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !skill) return;
    const idx = lessons.findIndex((x) => x.id === l.id);
    if (idx >= completed) {
      await supabase.from("user_skills")
        .update({ completed_lessons: idx + 1, last_lesson_at: new Date().toISOString() })
        .eq("user_id", user.id).eq("skill_id", skill.id);
      await earn(l.coin_reward, `lesson_complete`, { skill_id: skill.id, lesson_id: l.id });
      toast({ title: `+${l.coin_reward} coin`, description: `Lesson complete · +${l.xp_reward} XP` });
      setCompleted(idx + 1);
    }
    setActive(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!skill) {
    return <div className="p-6 text-center text-muted-foreground">Skill not found.</div>;
  }

  if (active) {
    return (
      <div className="animate-fade-in pb-6">
        <StatusBar />
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => setActive(null)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="font-bold text-sm">Lesson {active.position}</p>
        </div>
        <div className="px-5">
          <h1 className="font-bold text-xl leading-tight">{active.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{active.duration_min} min · +{active.xp_reward} XP · +{active.coin_reward} coin</p>
          <div className="mt-4 rounded-2xl bg-card border border-border p-4 text-sm leading-relaxed">
            {active.body || "Follow along and explore the topic. Take notes as needed."}
          </div>
          <button onClick={() => completeLesson(active)} className="mt-6 w-full gradient-primary text-white font-bold rounded-2xl py-3 tap-scale inline-flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Mark Complete
          </button>
        </div>
      </div>
    );
  }

  const pct = Math.round((completed / Math.max(lessons.length, 1)) * 100);

  return (
    <div className="animate-fade-in pb-6">
      <StatusBar tone="hero" />
      <div className="relative px-5 pt-4 pb-6 gradient-hero text-white rounded-b-[28px] safe-top">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center backdrop-blur tap-scale">
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <CoinBalancePill />
        </div>
        <h1 className="font-bold text-xl">{skill.title}</h1>
        <p className="text-white/85 text-xs mt-1">{skill.description}</p>
        <div className="mt-4 rounded-2xl bg-white/15 backdrop-blur p-3">
          <div className="flex items-center justify-between text-xs"><span>Progress</span><span className="font-bold">{completed} / {lessons.length}</span></div>
          <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-2">
        {lessons.map((l, i) => {
          const done = i < completed;
          const locked = i > completed;
          return (
            <button key={l.id} disabled={locked}
              onClick={() => setActive(l)}
              className={`w-full text-left p-3 rounded-2xl border flex items-center gap-3 tap-scale ${done ? "bg-emerald-50 border-emerald-100" : locked ? "bg-secondary border-border opacity-60" : "bg-card border-border"}`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500 text-white" : "bg-primary-soft text-primary"}`}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{l.title}</p>
                <p className="text-[10px] text-muted-foreground">{l.duration_min} min · +{l.xp_reward} XP</p>
              </div>
              <div className="text-[10px] inline-flex items-center gap-0.5 font-bold text-amber-600">
                <Coins className="h-3 w-3" /> +{l.coin_reward}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SkillDetailPage;
