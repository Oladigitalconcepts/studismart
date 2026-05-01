import { useState } from "react";
import { ArrowLeft, Info, UploadCloud, Sparkles, FileText } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import aiRobot from "@/assets/ai-robot.png";

interface Props {
  onBack: () => void;
  onComplete: (studyPackId: string) => void;
}

const STAGES = [
  { key: "extract", label: "Reading material" },
  { key: "identify", label: "Identifying topics" },
  { key: "summary", label: "Generating summary" },
  { key: "questions", label: "Creating questions" },
] as const;

export const UploadScreen = ({ onBack, onComplete }: Props) => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);

  const advance = () => {
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(i + 1, STAGES.length - 1);
      setStageIdx(i);
    }, 1400);
    return () => clearInterval(id);
  };

  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Please sign in again", variant: "destructive" }); return; }

    const finalTitle = title.trim() || file?.name?.replace(/\.[^.]+$/, "") || "Untitled material";

    if (!file && text.trim().length < 30) {
      toast({ title: "Add a file or paste at least 30 characters of text", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setStageIdx(0);
    const stop = advance();

    try {
      let storagePath: string | null = null;
      let rawText: string | null = text.trim() || null;

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(storagePath, file);
        if (upErr) throw upErr;

        if (file.type.startsWith("text/") || ext === "txt" || ext === "md") {
          rawText = await file.text();
        }
      }

      const { data: material, error: matErr } = await supabase
        .from("materials")
        .insert({
          user_id: user.id,
          title: finalTitle,
          source_type: file ? "file" : "text",
          storage_path: storagePath,
          raw_text: rawText,
          status: "pending",
        })
        .select()
        .single();
      if (matErr || !material) throw matErr ?? new Error("Could not save material");

      const { data, error } = await supabase.functions.invoke("generate-study-pack", {
        body: { material_id: material.id },
      });
      if (error) throw error;
      const packId = (data as any)?.study_pack_id;
      if (!packId) throw new Error("No study pack returned");

      stop();
      setStageIdx(STAGES.length - 1);
      toast({ title: "Study pack ready!" });
      onComplete(packId);
    } catch (e: any) {
      stop();
      setProcessing(false);
      toast({ title: e?.message ?? "Upload failed", variant: "destructive" });
    }
  };

  if (processing) {
    return (
      <div className="animate-fade-in">
        <StatusBar />
        <div className="px-6 pt-16 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl animate-pulse-glow" />
            <img src={aiRobot} alt="" width={1024} height={1024} className="relative w-48 h-48 object-contain animate-float" />
          </div>
          <h2 className="text-xl font-bold mt-6">Analyzing your material…</h2>

          <div className="w-full mt-8 space-y-3">
            {STAGES.map((s, i) => (
              <div key={s.key} className="flex items-center gap-3 text-left">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${i <= stageIdx ? "bg-success text-success-foreground" : "bg-muted"}`}>
                  {i < stageIdx ? "✓" : i === stageIdx ? "•" : ""}
                </div>
                <span className={`text-sm ${i <= stageIdx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full mt-8">
            <Progress value={((stageIdx + 1) / STAGES.length) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-3">This may take 10–30 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-lg">Upload Material</h1>
        <button className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <Info className="h-5 w-5" />
        </button>
      </header>

      <div className="px-5 mt-2 space-y-4">
        <Input
          placeholder="Title (e.g. Data Structures Lecture 3)"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          className="h-12 rounded-xl"
        />

        <label className="block">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,text/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/50 p-8 flex flex-col items-center text-center cursor-pointer tap-scale">
            <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
              {file ? <FileText className="h-7 w-7 text-primary" /> : <UploadCloud className="h-7 w-7 text-primary" />}
            </div>
            <p className="text-sm font-medium">{file ? file.name : "Tap to choose a file"}</p>
            <p className="text-[11px] text-muted-foreground mt-2">PDF, DOCX, TXT — text files work best</p>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">Or paste your text</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 18000))}
            placeholder="Paste your lecture notes…"
            className="min-h-[140px] border-0 rounded-2xl resize-none focus-visible:ring-0 bg-transparent"
          />
          <div className="flex justify-end px-3 pb-2">
            <span className="text-[10px] text-muted-foreground">{text.length}/18000</span>
          </div>
        </div>

        {(file || text.length > 20) && (
          <Button onClick={submit} className="w-full h-12 rounded-2xl gradient-primary tap-scale font-semibold animate-slide-up">
            <Sparkles className="h-4 w-4 mr-2" /> Generate Study Pack
          </Button>
        )}
      </div>
    </div>
  );
};
