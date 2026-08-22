import { bumpMission } from "@/lib/missions";
import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Copy, Share2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBar } from "@/components/studymind/StatusBar";
import { TestUpload } from "@/components/studymind/test/TestUpload";
import { TestConfigure } from "@/components/studymind/test/TestConfigure";
import { LibraryPickerSheet } from "@/components/studymind/test/LibraryPickerSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  prepareSourceFromFiles,
  prepareSourceFromMaterial,
  generatePack,
  TestConfig,
  PreparedSource,
  makeShareToken,
} from "@/lib/testBuilder";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

type Step = "upload" | "preparing" | "configure" | "generating" | "share";

const QuizForOthersPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pasted, setPasted] = useState("");
  const [stage, setStage] = useState("Preparing");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [source, setSource] = useState<PreparedSource | null>(null);
  const [config, setConfig] = useState<TestConfig>({ numQuestions: 10, timeLimitSeconds: 600, revealMode: "end" });
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const applySource = (prepared: PreparedSource) => {
    setSource(prepared);
    if (!title) setTitle(prepared.title);
    setConfig((c) => ({ ...c, numQuestions: Math.min(c.numQuestions, prepared.capacity) || prepared.capacity }));
    setStep("configure");
  };

  const prepareFromUpload = async () => {
    setStep("preparing");
    track("create_test_started", { mode: "shared" });
    try {
      applySource(await prepareSourceFromFiles({
        files, pastedText: pasted, title: title || "Quiz challenge", onStage: setStage,
      }));
    } catch (e: any) {
      toast({ title: e?.message ?? "Couldn't read your material", variant: "destructive" });
      setStep("upload");
    }
  };

  const prepareFromLibrary = async (materialId: string) => {
    setStep("preparing");
    setStage("Reading material");
    try {
      applySource(await prepareSourceFromMaterial(materialId));
    } catch (e: any) {
      toast({ title: e?.message ?? "Couldn't read that material", variant: "destructive" });
      setStep("upload");
    }
  };

  const generateAndShare = async () => {
    if (!source) return;
    setStep("generating");
    setStage("Generating questions");
    try {
      const pack = await generatePack(source.materialId, Math.min(config.numQuestions, source.capacity));
      const { data: { user } } = await getCurrentUser();
      if (!user) throw new Error("Sign in required");
      const subset = pack.questions.slice(0, config.numQuestions);
      const token = makeShareToken();
      setStage("Creating share link");
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
      setStep("configure");
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

  const busy = step === "preparing" || step === "generating";

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
          onContinue={prepareFromUpload}
          onPickLibrary={() => setPickerOpen(true)}
          ctaLabel="Continue"
        />
      )}

      {busy && (
        <div className="px-6 pt-16 flex flex-col items-center text-center">
          <Sparkles className="h-16 w-16 text-primary animate-float" />
          <h2 className="text-xl font-bold mt-6">{stage}…</h2>
          <Loader2 className="h-6 w-6 animate-spin text-primary mt-6" />
        </div>
      )}

      {step === "configure" && source && (
        <TestConfigure
          available={source.capacity}
          config={config}
          setConfig={setConfig}
          onStart={generateAndShare}
          ctaLabel="Generate & get share link"
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

      <LibraryPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(materialId, t) => { setTitle(t); prepareFromLibrary(materialId); }}
      />
    </div>
  );
};

export default QuizForOthersPage;
