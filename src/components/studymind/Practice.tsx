import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, X, Clock, Loader2 } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cacheGet, cacheSet, enqueueOp, flushQueue } from "@/lib/offlineCache";

interface Props {
  studyPackId: string | null;
  onBack: () => void;
  onFinish: () => void;
}

interface Q {
  id: string;
  topic: string | null;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

export const Practice = ({ studyPackId, onBack, onFinish }: Props) => {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const startedAt = useMemo(() => Date.now(), [questions.length > 0]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const cacheKey = `questions:${studyPackId ?? "any"}`;

      // Hydrate from cache first so practice works offline.
      const cached = cacheGet<Q[]>(user?.id ?? null, cacheKey);
      if (cached && cached.length > 0 && !cancelled) {
        setQuestions(cached);
        setLoading(false);
      }

      if (!navigator.onLine) {
        if (!cached && !cancelled) setLoading(false);
        return;
      }

      let q = supabase.from("questions").select("*").order("created_at", { ascending: true }).limit(25);
      if (studyPackId) q = q.eq("study_pack_id", studyPackId);
      const { data, error } = await q;
      if (cancelled) return;
      if (error && !cached) {
        toast({ title: error.message, variant: "destructive" });
      }
      if (data) {
        setQuestions(data as any);
        cacheSet(user?.id ?? null, cacheKey, data);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [studyPackId]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const current = questions[idx];

  const submit = async () => {
    if (selected == null || !current) return;
    setSubmitted(true);
    const isCorrect = selected === current.correct_index;
    if (isCorrect) setCorrectCount((c) => c + 1);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      question_id: current.id,
      topic: current.topic,
      is_correct: isCorrect,
    };

    if (!navigator.onLine) {
      enqueueOp({ kind: "answer_attempt", payload });
      return;
    }
    const { error } = await supabase.from("answer_attempts").insert(payload);
    if (error) {
      // Network error or transient failure — queue for later sync.
      enqueueOp({ kind: "answer_attempt", payload });
    }
  };

  const next = async () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setSelected(null);
      setSubmitted(false);
      return;
    }
    // Finish
    setFinishing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = {
        user_id: user.id,
        study_pack_id: studyPackId,
        total: questions.length,
        correct: correctCount,
        duration_seconds: Math.round((Date.now() - startedAt) / 1000),
      };
      if (!navigator.onLine) {
        enqueueOp({ kind: "practice_attempt", payload });
      } else {
        const { error } = await supabase.from("practice_attempts").insert(payload);
        if (error) enqueueOp({ kind: "practice_attempt", payload });
        // Opportunistically flush any queued ops while we're online.
        flushQueue(supabase as never).catch(() => {});
      }
    }
    onFinish();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="animate-fade-in">
        <StatusBar />
        <header className="flex items-center justify-between px-5 py-3">
          <button onClick={onBack} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold">Practice</h1>
          <div className="w-10" />
        </header>
        <p className="text-center text-sm text-muted-foreground mt-20 px-8">
          No questions yet. Upload a material to generate practice questions.
        </p>
      </div>
    );
  }

  const isCorrect = submitted && selected === current.correct_index;
  const progress = ((idx + (submitted ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold">MCQ {idx + 1}/{questions.length}</h1>
        <div className="px-3 h-10 rounded-full bg-primary-soft flex items-center gap-1.5 text-primary font-bold text-sm">
          <Clock className="h-4 w-4" />
          {mm}:{ss}
        </div>
      </header>

      <div className="px-5 mt-4">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {submitted && (
        <div className={cn(
          "mx-5 mt-5 p-4 rounded-2xl flex items-start gap-3 animate-scale-in",
          isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        )}>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0", isCorrect ? "bg-success" : "bg-destructive")}>
            {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </div>
          <div className="text-foreground">
            <p className={cn("font-bold text-sm", isCorrect ? "text-success" : "text-destructive")}>
              {isCorrect ? "Correct! 🎉" : "Not quite"}
            </p>
            {current.explanation && <p className="text-xs mt-1 text-muted-foreground">{current.explanation}</p>}
          </div>
        </div>
      )}

      <div className="px-5 mt-6">
        <p className="text-base font-semibold leading-snug">{current.question}</p>

        <div className="mt-6 space-y-3">
          {current.options.map((text, i) => {
            const isSelected = selected === i;
            const showCorrect = submitted && i === current.correct_index;
            const showWrong = submitted && isSelected && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => !submitted && setSelected(i)}
                disabled={submitted}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center gap-4 border-2 transition-base text-left tap-scale",
                  showCorrect && "border-success bg-success/10",
                  showWrong && "border-destructive bg-destructive/10",
                  !submitted && isSelected && "border-primary bg-primary-soft",
                  !isSelected && !showCorrect && "border-border bg-card"
                )}
              >
                <div className={cn(
                  "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                  showCorrect && "border-success bg-success",
                  showWrong && "border-destructive bg-destructive",
                  !submitted && isSelected && "border-primary bg-primary",
                  !isSelected && !showCorrect && "border-muted-foreground/40"
                )}>
                  {(isSelected || showCorrect) && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <span className="text-sm font-medium">{String.fromCharCode(65 + i)}. {text}</span>
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <Button
            onClick={submitted ? next : submit}
            disabled={finishing}
            className="w-full h-12 mt-6 rounded-2xl gradient-primary tap-scale font-semibold animate-slide-up"
          >
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> :
              submitted ? (idx + 1 < questions.length ? "Next Question" : "Finish") : "Submit Answer"}
          </Button>
        )}
      </div>
    </div>
  );
};
