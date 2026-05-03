import { CheckCircle2, XCircle, Trophy, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/testBuilder";

export interface ReviewItem {
  question: string;
  options: string[];
  correct_index: number;
  picked_index: number;
  explanation?: string | null;
  is_correct: boolean;
}

interface Props {
  title?: string;
  correct: number;
  total: number;
  durationSeconds: number;
  review: ReviewItem[];
  primaryAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  secondaryAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
}

export const TestResult = ({ title, correct, total, durationSeconds, review, primaryAction, secondaryAction }: Props) => {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const tone = pct >= 80 ? "text-success" : pct >= 50 ? "text-primary" : "text-destructive";

  return (
    <div className="px-5 mt-2 space-y-5 animate-fade-in pb-10">
      <div className="rounded-3xl gradient-primary text-primary-foreground p-6 text-center">
        <Trophy className="h-10 w-10 mx-auto mb-2" />
        {title && <p className="text-sm opacity-90">{title}</p>}
        <h2 className="text-3xl font-bold mt-1">{pct}%</h2>
        <p className="text-sm mt-1">{correct} / {total} correct · {formatTime(durationSeconds)}</p>
      </div>

      <div className="space-y-3">
        {review.map((r, i) => (
          <div key={i} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start gap-2">
              {r.is_correct
                ? <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="font-medium text-sm">{i + 1}. {r.question}</p>
                <div className="mt-2 space-y-1">
                  {r.options.map((opt, j) => {
                    const correct = j === r.correct_index;
                    const picked = j === r.picked_index;
                    return (
                      <div
                        key={j}
                        className={`text-xs rounded-lg px-3 py-2 border
                          ${correct ? "border-success bg-success/10"
                            : picked ? "border-destructive bg-destructive/10"
                            : "border-border"}`}
                      >
                        {opt}
                      </div>
                    );
                  })}
                </div>
                {r.explanation && <p className="text-xs text-muted-foreground mt-2">{r.explanation}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sticky bottom-4">
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick} className="h-12 rounded-2xl">
            {secondaryAction.icon ?? <Home className="h-4 w-4" />} {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button onClick={primaryAction.onClick} className="h-12 rounded-2xl gradient-primary">
            {primaryAction.icon ?? <RotateCcw className="h-4 w-4" />} {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};
