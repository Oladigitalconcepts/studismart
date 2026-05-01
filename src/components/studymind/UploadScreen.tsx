import { useState } from "react";
import { ArrowLeft, Info, UploadCloud, Sparkles } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import aiRobot from "@/assets/ai-robot.png";
import { Progress } from "@/components/ui/progress";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export const UploadScreen = ({ onBack, onComplete }: Props) => {
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState({ extract: false, identify: false, summary: false, questions: false });

  const startProcessing = () => {
    setProcessing(true);
    const stages: Array<keyof typeof steps> = ["extract", "identify", "summary", "questions"];
    stages.forEach((stage, i) => {
      setTimeout(() => {
        setSteps((prev) => ({ ...prev, [stage]: true }));
        setProgress((i + 1) * 25);
        if (i === stages.length - 1) setTimeout(onComplete, 600);
      }, (i + 1) * 700);
    });
  };

  if (processing) {
    return (
      <div className="animate-fade-in">
        <StatusBar />
        <div className="px-6 pt-16 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl animate-pulse-glow" />
            <img src={aiRobot} alt="AI processing" width={1024} height={1024} className="relative w-48 h-48 object-contain animate-float" />
          </div>
          <h2 className="text-xl font-bold mt-6">Analyzing your material...</h2>

          <div className="w-full mt-8 space-y-3">
            {[
              { key: "extract", label: "Extracting text" },
              { key: "identify", label: "Identifying topics" },
              { key: "summary", label: "Generating summary" },
              { key: "questions", label: "Creating questions" },
            ].map((s) => (
              <div key={s.key} className="flex items-center gap-3 text-left">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${steps[s.key as keyof typeof steps] ? "bg-success text-success-foreground" : "bg-muted"}`}>
                  {steps[s.key as keyof typeof steps] ? "✓" : ""}
                </div>
                <span className={`text-sm ${steps[s.key as keyof typeof steps] ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="w-full mt-8">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-3">This may take a few seconds</p>
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

      <div className="px-5 mt-2">
        <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/50 p-8 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
            <UploadCloud className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm font-medium">Drag & drop your file here</p>
          <p className="text-xs text-muted-foreground my-3">or</p>
          <Button onClick={startProcessing} className="h-10 px-6 rounded-xl gradient-primary tap-scale">
            Choose File
          </Button>
          <p className="text-[11px] text-muted-foreground mt-4">Supported: PDF, DOCX, PPT, TXT</p>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">Or paste your text</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 5000))}
            placeholder="Paste your lecture notes or any text content here..."
            className="min-h-[140px] border-0 rounded-2xl resize-none focus-visible:ring-0 bg-transparent"
          />
          <div className="flex justify-end px-3 pb-2">
            <span className="text-[10px] text-muted-foreground">{text.length}/5000</span>
          </div>
        </div>

        {text.length > 20 && (
          <Button onClick={startProcessing} className="w-full h-12 mt-4 rounded-2xl gradient-primary tap-scale font-semibold animate-slide-up">
            <Sparkles className="h-4 w-4 mr-2" /> Generate Study Pack
          </Button>
        )}
      </div>
    </div>
  );
};
