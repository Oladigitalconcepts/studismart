import { useEffect, useState } from "react";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onBack: () => void;
  onFinish: () => void;
}

const options = [
  { id: "A", text: "Queue" },
  { id: "B", text: "Stack" },
  { id: "C", text: "Array" },
  { id: "D", text: "Linked List" },
];
const correct = "B";

export const Practice = ({ onBack, onFinish }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(29 * 60 + 45);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const handleNext = () => {
    if (!submitted && selected) { setSubmitted(true); return; }
    onFinish();
  };

  const isCorrect = selected === correct;

  return (
    <div className="animate-fade-in">
      <StatusBar />
      <header className="flex items-center justify-between px-5 py-3">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold">MCQ 1/25</h1>
        <div className="px-3 h-10 rounded-full bg-primary-soft flex items-center gap-1.5 text-primary font-bold text-sm">
          <Clock className="h-4 w-4" />
          {mm}:{ss}
        </div>
      </header>

      <div className="px-5 mt-4">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full gradient-primary rounded-full" style={{ width: "4%" }} />
        </div>
      </div>

      {submitted && (
        <div className={cn(
          "mx-5 mt-5 p-4 rounded-2xl flex items-center gap-3 animate-scale-in",
          isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        )}>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white", isCorrect ? "bg-success" : "bg-destructive")}>
            {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-bold text-sm">{isCorrect ? "Correct! 🎉" : "Not quite"}</p>
            <p className="text-xs opacity-90">Stack follows LIFO principle.</p>
          </div>
        </div>
      )}

      <div className="px-5 mt-6">
        <p className="text-base font-semibold leading-snug">
          Which of the following data structures uses LIFO (Last In First Out) principle?
        </p>

        <div className="mt-6 space-y-3">
          {options.map((o) => {
            const isSelected = selected === o.id;
            const showCorrect = submitted && o.id === correct;
            const showWrong = submitted && isSelected && !isCorrect;
            return (
              <button
                key={o.id}
                onClick={() => !submitted && setSelected(o.id)}
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
                <span className="text-sm font-medium">{o.id}. {o.text}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <Button onClick={handleNext} className="w-full h-12 mt-6 rounded-2xl gradient-primary tap-scale font-semibold animate-slide-up">
            {submitted ? "Next Question" : "Submit Answer"}
          </Button>
        )}
      </div>
    </div>
  );
};
