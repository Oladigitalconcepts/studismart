import { bumpMission } from "@/lib/missions";
import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Copy, Share2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { TestUpload } from "@/components/studymind/test/TestUpload";
import { TestConfigure } from "@/components/studymind/test/TestConfigure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPackFromFiles, BuiltPack, TestConfig, makeShareToken } from "@/lib/testBuilder";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

type Step = "upload" | "building" | "configure" | "share";

const QuizForOthersPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pasted, setPasted] = useState("");
  const [stage, setStage] = useState("Preparing");
  const [pack, setPack] = useState<BuiltPack | null>(null);
  const [config, setConfig] = useState<TestConfig>({ numQuestions: 10, timeLimitSeconds: 600, revealMode: "end" });
  const [shareUrl, setShareUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const startBuild = async () => {
    setStep("building");
    track("create_test_started", { mode: "shared" });
    try {
      const built = await buildPackFromFiles({
        files, pastedText: pasted, title: title || "Quiz challenge",
        onStage: setStage,
      });
      setPack(built);
      setConfig((c) => ({ ...c, numQuestions: Math.min(built.questions.length, 10) || c.numQuestions }));
      setStep("configure");
    } catch (e: any) {
      toast({ title: e?.message ?? "Couldn't build quiz", variant: "destructive" });
      setStep("upload");
    }
  };

  const createShareLink = async () => {
    if (!pack) return;
    setCreating(true);
    try {
      const { data: { user } } = await getCurrentUser();
      if (!user) throw new Error("Sign in required");
      const subset = pack.questions.slice(0, config.numQuestions);
      const token = makeShareToken();
      const { error } = await supabase.from("shared_quizzes").insert({
        token,
        creator_id: user.id,
        title: title || "Quiz challenge",
        study_pack_id: pack.studyPackId,
        question_ids: subset.map((q) => q.id),
        time_limit_seconds: config.timeLimitSeconds,
        reveal_mode: config.revealMode,
      });
      if (error) throw error;
      const url = `${window.location.origin}/q/${token}`;
      setShareUrl(url);
      track("shared_quiz_created", { token, num_questions: subset.length });
      track("quiz_created", { token, num_questions: subset.length, mode: "shared" });
      bumpMission("share_quiz").catch(() => {});
      setStep("share");
    } catch (e: any) {
      toast({ title: e?.message ?? "Could not create link", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track("shared_quiz_link_copied", {});
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "Try my quiz", url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      copy();
    }
  };

  const back = () => {
    if (step === "share") setStep("configure");
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
        <h1 className="font-bold text-lg">Quiz for Others</h1>
        <div className="w-10" />
      </header>

      {step === "upload" && (
        <TestUpload
          title={title} setTitle={setTitle}
          files={files} setFiles={setFiles}
          pastedText={pasted} setPastedText={setPasted}
          onContinue={startBuild}
          ctaLabel="Generate quiz"
        />
      )}

      {step === "building" && (
        <div className="px-6 pt-16 flex flex-col items-center text-center">
          <Sparkles className="h-16 w-16 text-primary animate-float" />
          <h2 className="text-xl font-bold mt-6">{stage}…</h2>
          <Loader2 className="h-6 w-6 animate-spin text-primary mt-6" />
        </div>
      )}

      {step === "configure" && pack && (
        <TestConfigure
          available={pack.questions.length}
          config={config}
          setConfig={setConfig}
          onStart={createShareLink}
          ctaLabel={creating ? "Creating link…" : "Get share link"}
          startingDisabled={creating}
        />
      )}

      {step === "share" && (
        <div className="px-5 mt-2 space-y-5 animate-fade-in">
          <div className="rounded-3xl gradient-primary text-primary-foreground p-6 text-center">
            <Share2 className="h-10 w-10 mx-auto" />
            <h2 className="text-xl font-bold mt-2">Your quiz is ready!</h2>
            <p className="text-sm opacity-90 mt-1">Share this link — anyone can take it.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 flex items-center gap-2">
            <Input readOnly value={shareUrl} className="border-0 focus-visible:ring-0 text-sm" />
            <Button onClick={copy} variant="outline" className="h-10 rounded-xl">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={shareNative} className="w-full h-12 rounded-2xl gradient-primary font-semibold">
            <Share2 className="h-4 w-4 mr-2" /> Share link
          </Button>
          <Button variant="outline" onClick={() => navigate("/home")} className="w-full h-12 rounded-2xl">
            Done
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuizForOthersPage;
