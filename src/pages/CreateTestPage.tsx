import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { TestUpload } from "@/components/studymind/test/TestUpload";
import { TestConfigure } from "@/components/studymind/test/TestConfigure";
import { TestRunner, RunnerAnswer, RunnerQuestion } from "@/components/studymind/test/TestRunner";
import { TestResult, ReviewItem } from "@/components/studymind/test/TestResult";
import { buildPackFromFiles, BuiltPack, TestConfig } from "@/lib/testBuilder";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

type Step = "upload" | "building" | "configure" | "runner" | "result";

const CreateTestPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pasted, setPasted] = useState("");
  const [stage, setStage] = useState("Preparing");
  const [pack, setPack] = useState<BuiltPack | null>(null);
  const [config, setConfig] = useState<TestConfig>({ numQuestions: 10, timeLimitSeconds: 600, revealMode: "immediate" });
  const [running, setRunning] = useState<RunnerQuestion[]>([]);
  const [result, setResult] = useState<{ correct: number; total: number; duration: number; review: ReviewItem[] } | null>(null);

  const startBuild = async () => {
    setStep("building");
    track("create_test_started", {});
    try {
      const built = await buildPackFromFiles({
        files, pastedText: pasted, title,
        onStage: (s) => setStage(s),
      });
      setPack(built);
      track("quiz_created", { mode: "self", num_questions: built.questions.length });
      const cap = Math.min(built.questions.length, 10);
      setConfig((c) => ({ ...c, numQuestions: cap || c.numQuestions }));
      setStep("configure");
    } catch (e: any) {
      toast({ title: e?.message ?? "Couldn't build the test", variant: "destructive" });
      setStep("upload");
    }
  };

  const startRun = () => {
    if (!pack) return;
    const subset = pack.questions.slice(0, config.numQuestions).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
    }));
    setRunning(subset);
    track("test_configured", { num_questions: subset.length, time_limit_seconds: config.timeLimitSeconds, reveal_mode: config.revealMode });
    setStep("runner");
  };

  const handleFinish = (answers: RunnerAnswer[], duration: number) => {
    const byId = new Map(running.map((q) => [q.id, q]));
    const review: ReviewItem[] = running.map((q) => {
      const a = answers.find((x) => x.question_id === q.id);
      return {
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        picked_index: a?.picked_index ?? -1,
        explanation: q.explanation,
        is_correct: a?.is_correct ?? false,
      };
    });
    const correct = answers.filter((a) => a.is_correct).length;
    setResult({ correct, total: running.length, duration, review });
    track("test_completed", { correct, total: running.length, duration });
    setStep("result");
  };

  const back = () => {
    if (step === "result" || step === "runner") setStep("configure");
    else if (step === "configure") setStep("upload");
    else navigate(-1);
  };

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <button onClick={back} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-lg">Create Test</h1>
        <div className="w-10" />
      </header>

      {step === "upload" && (
        <TestUpload
          title={title} setTitle={setTitle}
          files={files} setFiles={setFiles}
          pastedText={pasted} setPastedText={setPasted}
          onContinue={startBuild}
          ctaLabel="Generate questions"
        />
      )}

      {step === "building" && (
        <div className="px-6 pt-16 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl animate-pulse-glow" />
            <Sparkles className="relative h-16 w-16 text-primary animate-float" />
          </div>
          <h2 className="text-xl font-bold mt-6">{stage}…</h2>
          <p className="text-sm text-muted-foreground mt-2">Reading your material and crafting questions.</p>
          <Loader2 className="h-6 w-6 animate-spin text-primary mt-6" />
        </div>
      )}

      {step === "configure" && pack && (
        <TestConfigure
          available={pack.questions.length}
          config={config}
          setConfig={setConfig}
          onStart={startRun}
        />
      )}

      {step === "runner" && running.length > 0 && (
        <TestRunner
          questions={running}
          timeLimitSeconds={config.timeLimitSeconds}
          revealMode={config.revealMode}
          onFinish={handleFinish}
        />
      )}

      {step === "result" && result && (
        <TestResult
          title={title || "Your test"}
          correct={result.correct}
          total={result.total}
          durationSeconds={result.duration}
          review={result.review}
          primaryAction={{ label: "Retake", onClick: () => { setResult(null); startRun(); } }}
          secondaryAction={{ label: "Home", onClick: () => navigate("/home") }}
        />
      )}
    </div>
  );
};

export default CreateTestPage;
