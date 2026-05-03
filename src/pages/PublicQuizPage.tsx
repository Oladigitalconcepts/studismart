import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, GraduationCap } from "lucide-react";
import { StatusBar } from "@/components/studymind/StatusBar";
import { Button } from "@/components/ui/button";
import { TestRunner, RunnerAnswer, RunnerQuestion } from "@/components/studymind/test/TestRunner";
import { TestResult, ReviewItem } from "@/components/studymind/test/TestResult";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface QuizMeta {
  id: string;
  token: string;
  title: string;
  time_limit_seconds: number;
  reveal_mode: "immediate" | "end";
  questions: Array<{ id: string; question: string; options: string[]; topic?: string | null }>;
}

interface PendingSubmission {
  token: string;
  answers: RunnerAnswer[];
  duration: number;
  startedAt: number;
}

const STORAGE_KEY = "studymind:pending-shared-quiz";

const PublicQuizPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<QuizMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"intro" | "running" | "submitting" | "result">("intro");
  const [result, setResult] = useState<{ correct: number; total: number; duration: number; review: ReviewItem[]; title: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    track("quiz_shared_link_opened", { token });
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-quiz?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Quiz not found");
        return r.json();
      })
      .then((data: QuizMeta) => setMeta(data))
      .catch((e) => toast({ title: e?.message ?? "Quiz not found", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [token]);

  // After login, if there's a pending submission for this token, replay it.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || !meta) return;
    try {
      const pending: PendingSubmission = JSON.parse(raw);
      if (pending.token !== meta.token) return;
      (async () => {
        const { data: { user } } = await getCurrentUser();
        if (!user) return; // still anonymous
        setStep("submitting");
        await submit(pending.answers, pending.duration);
        localStorage.removeItem(STORAGE_KEY);
      })();
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  const start = () => {
    track("public_quiz_started", { token });
    setStep("running");
  };

  const submit = async (answers: RunnerAnswer[], duration: number) => {
    if (!meta) return;
    const { data: { user } } = await getCurrentUser();
    if (!user) {
      // Stash and force sign-in
      const pending: PendingSubmission = { token: meta.token, answers, duration, startedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
      track("public_quiz_signin_for_result", { token: meta.token });
      navigate(`/auth?redirect=${encodeURIComponent(`/q/${meta.token}`)}`);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("submit-shared-quiz", {
        body: { token: meta.token, answers, duration_seconds: duration },
      });
      if (error) throw error;
      const r = data as any;
      const review: ReviewItem[] = (r.review ?? []).map((it: any) => ({
        question: it.question,
        options: it.options,
        correct_index: it.correct_index,
        picked_index: it.picked_index,
        explanation: it.explanation,
        is_correct: it.is_correct,
      }));
      setResult({ correct: r.correct, total: r.total, duration: r.duration_seconds, review, title: r.title });
      track("public_quiz_submitted", { token: meta.token, correct: r.correct, total: r.total });
      setStep("result");
    } catch (e: any) {
      toast({ title: e?.message ?? "Could not submit", variant: "destructive" });
      setStep("running");
    }
  };

  const handleFinish = (answers: RunnerAnswer[], duration: number) => {
    setStep("submitting");
    void submit(answers, duration);
  };

  if (loading) {
    return (
      <main className="screen-shell flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!meta) {
    return (
      <main className="screen-shell px-6 pt-20 text-center">
        <h1 className="font-bold text-xl">Quiz not found</h1>
        <p className="text-sm text-muted-foreground mt-2">The link may be wrong or expired.</p>
        <Button className="mt-6" onClick={() => navigate("/")}>Go home</Button>
      </main>
    );
  }

  // For anonymous takers we hide the correct_index by sending placeholder; but TestRunner needs it
  // to compute is_correct locally. Solution: we inject correct_index = -1 so client cannot reveal,
  // and rely on server to score. We also force revealMode 'end' for anonymous takers.
  const runnerQs: RunnerQuestion[] = meta.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correct_index: -1, // unknown to client; server scores authoritatively
    explanation: null,
  }));

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-center px-5 py-3 gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-lg">StudyMind AI</h1>
      </header>

      {step === "intro" && (
        <div className="px-5 mt-4 space-y-4 text-center">
          <div className="rounded-3xl gradient-primary text-primary-foreground p-6">
            <h2 className="text-2xl font-bold">{meta.title}</h2>
            <p className="text-sm opacity-90 mt-1">{meta.questions.length} questions · {Math.round(meta.time_limit_seconds / 60)} min</p>
          </div>
          <p className="text-sm text-muted-foreground">When you finish, sign in to see your score.</p>
          <Button onClick={start} className="w-full h-12 rounded-2xl gradient-primary font-semibold">
            Start quiz
          </Button>
        </div>
      )}

      {step === "running" && (
        <TestRunner
          questions={runnerQs}
          timeLimitSeconds={meta.time_limit_seconds}
          revealMode="end"
          hideAnswersClient
          onFinish={handleFinish}
        />
      )}

      {step === "submitting" && (
        <div className="px-6 pt-16 flex flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-4">Scoring your answers…</p>
        </div>
      )}

      {step === "result" && result && (
        <TestResult
          title={result.title}
          correct={result.correct}
          total={result.total}
          durationSeconds={result.duration}
          review={result.review}
          primaryAction={{ label: "Try StudyMind", onClick: () => navigate("/home") }}
          secondaryAction={{ label: "Share score", onClick: async () => {
            const text = `I scored ${result.correct}/${result.total} on "${result.title}" — try it: ${window.location.href}`;
            if (navigator.share) await navigator.share({ text }).catch(() => {});
            else await navigator.clipboard.writeText(text);
          } }}
        />
      )}
    </div>
  );
};

export default PublicQuizPage;
