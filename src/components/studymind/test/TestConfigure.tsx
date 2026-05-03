import { Eye, EyeOff, Clock, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RevealMode, TestConfig } from "@/lib/testBuilder";

interface Props {
  available: number;
  config: TestConfig;
  setConfig: (c: TestConfig) => void;
  onStart: () => void;
  ctaLabel?: string;
  startingDisabled?: boolean;
}

const QUESTION_OPTIONS = [5, 10, 15, 20, 30];
const TIME_OPTIONS = [
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
  { label: "20 min", value: 1200 },
  { label: "30 min", value: 1800 },
];

export const TestConfigure = ({ available, config, setConfig, onStart, ctaLabel = "Start test", startingDisabled }: Props) => {
  const update = (patch: Partial<TestConfig>) => setConfig({ ...config, ...patch });
  const cappedQ = QUESTION_OPTIONS.filter((n) => n <= Math.max(1, available));
  if (!cappedQ.length) cappedQ.push(available);

  return (
    <div className="px-5 mt-2 space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Number of questions</h3>
          <span className="ml-auto text-xs text-muted-foreground">{available} available</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {cappedQ.map((n) => (
            <button
              key={n}
              onClick={() => update({ numQuestions: n })}
              className={`h-11 rounded-xl text-sm font-medium tap-scale ${config.numQuestions === n ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Time limit</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ timeLimitSeconds: t.value })}
              className={`h-11 rounded-xl text-sm font-medium tap-scale ${config.timeLimitSeconds === t.value ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Show answers</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => update({ revealMode: "immediate" as RevealMode })}
            className={`h-12 rounded-xl text-sm font-medium tap-scale flex items-center justify-center gap-2 ${config.revealMode === "immediate" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
          >
            <Eye className="h-4 w-4" /> After each
          </button>
          <button
            onClick={() => update({ revealMode: "end" as RevealMode })}
            className={`h-12 rounded-xl text-sm font-medium tap-scale flex items-center justify-center gap-2 ${config.revealMode === "end" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
          >
            <EyeOff className="h-4 w-4" /> At the end
          </button>
        </div>
      </div>

      <Button
        onClick={onStart}
        disabled={startingDisabled}
        className="w-full h-12 rounded-2xl gradient-primary font-semibold tap-scale"
      >
        {ctaLabel}
      </Button>
    </div>
  );
};
