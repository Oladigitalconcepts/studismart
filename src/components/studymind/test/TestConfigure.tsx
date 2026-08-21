import { Eye, EyeOff, Clock, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RevealMode, TestConfig } from "@/lib/testBuilder";

interface Props {
  available: number;
  config: TestConfig;
  setConfig: (c: TestConfig) => void;
  onStart: () => void;
  ctaLabel?: string;
  startingDisabled?: boolean;
}

const QUESTION_OPTIONS = [5, 10, 15, 20, 30, 40, 50, 75, 100];
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
  const max = Math.max(1, available);
  const counts = QUESTION_OPTIONS.filter((n) => n <= max);
  if (!counts.includes(max)) counts.push(max);

  const customMinutes = Math.round(config.timeLimitSeconds / 60);
  const isPresetTime = TIME_OPTIONS.some((t) => t.value === config.timeLimitSeconds);

  return (
    <div className="px-5 mt-2 space-y-6 animate-fade-in pb-8">
      <div>
        <div className="flex items-start gap-2 mb-2">
          <ListChecks className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <h3 className="font-semibold text-sm">Number of questions</h3>
          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">{available} available</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {counts.map((n) => (
            <button
              key={n}
              onClick={() => update({ numQuestions: n })}
              className={`h-11 rounded-xl text-sm font-medium tap-scale ${config.numQuestions === n ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Based on the length of your material, up to {available} unique questions can be generated.
        </p>
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
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={240}
            inputMode="numeric"
            value={isPresetTime ? "" : String(customMinutes || "")}
            placeholder="Custom minutes"
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isFinite(v)) return;
              update({ timeLimitSeconds: Math.min(240, Math.max(1, v)) * 60 });
            }}
            className="h-11 rounded-xl flex-1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">minutes</span>
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
