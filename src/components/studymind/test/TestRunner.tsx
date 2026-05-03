import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/testBuilder";

export interface RunnerQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string | null;
}

export interface RunnerAnswer {
  question_id: string;
  picked_index: number;
  is_correct: boolean;
}

interface Props {
  questions: RunnerQuestion[];
  timeLimitSeconds: number;
  revealMode: "immediate" | "end";
  onFinish: (answers: RunnerAnswer[], elapsed: number) => void;
  // If true, hides correct_index/explanation while answering even though they're in props.
  hideAnswersClient?: boolean;
}

export const TestRunner = ({ questions, timeLimitSeconds, revealMode, onFinish, hideAnswersClient }: Props) => {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<RunnerAnswer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [remaining, setRemaining] = useState(timeLimitSeconds);
  const startedAt = useRef(Date.now());
  const finishedRef = useRef(false);

  const total = questions.length;
  const q = questions[idx];

  const finish = (a: RunnerAnswer[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(a, Math.round((Date.now() - startedAt.current) / 1000));
  };

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          finish(answers);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (i: number) => {
    if (showFeedback) return;
    setPicked(i);
  };

  const submitAnswer = () => {
    if (picked === null) return;
    const isCorrect = picked === q.correct_index;
    const next = [...answers, { question_id: q.id, picked_index: picked, is_correct: isCorrect }];
    setAnswers(next);
    if (revealMode === "immediate" && !hideAnswersClient) {
      setShowFeedback(true);
    } else {
      goNext(next);
    }
  };

  const goNext = (current: RunnerAnswer[]) => {
    setShowFeedback(false);
    setPicked(null);
    if (idx + 1 >= total) {
      finish(current);
    } else {
      setIdx(idx + 1);
    }
  };

  const pct = useMemo(() => ((idx) / total) * 100, [idx, total]);
  const danger = remaining <= 30;

  return (
    <div className="px-5 mt-2 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Question {idx + 1} of {total}</span>
        <div className={`flex items-center gap-1 text-sm font-semibold ${danger ? "text-destructive" : "text-foreground"}`}>
          <Clock className="h-4 w-4" />
          {formatTime(remaining)}
        </div>
      </div>
      <Progress value={pct} className="h-2" />

      <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
        <h2 className="font-semibold text-base">{q.question}</h2>
        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const isPicked = picked === i;
            const correct = showFeedback && i === q.correct_index;
            const wrong = showFeedback && isPicked && i !== q.correct_index;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={showFeedback}
                className={`w-full text-left px-4 py-3 rounded-xl border transition tap-scale
                  ${correct ? "border-success bg-success/10"
                    : wrong ? "border-destructive bg-destructive/10"
                    : isPicked ? "border-primary bg-primary-soft"
                    : "border-border bg-background"}`}
              >
                <span className="text-sm">{opt}</span>
              </button>
            );
          })}
        </div>

        {showFeedback && q.explanation && (
          <p className="mt-4 text-xs text-muted-foreground border-l-2 border-primary pl-3">{q.explanation}</p>
        )}
      </div>

      {!showFeedback ? (
        <Button disabled={picked === null} onClick={submitAnswer} className="w-full h-12 rounded-2xl gradient-primary font-semibold">
          {idx + 1 === total ? "Finish" : "Next"}
        </Button>
      ) : (
        <Button onClick={() => goNext(answers)} className="w-full h-12 rounded-2xl gradient-primary font-semibold">
          {idx + 1 === total ? "See result" : "Continue"}
        </Button>
      )}
    </div>
  );
};
