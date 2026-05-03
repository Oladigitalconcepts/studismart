import { useEffect, useRef, useState } from "react";
import { GraduationCap, Loader2, User as UserIcon, BookOpen, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

const LEVEL_OPTIONS = [
  "100 Level", "200 Level", "300 Level", "400 Level",
  "500 Level", "600 Level", "Postgrad", "Other",
];

const NAME_MAX = 12;
const COURSE_MAX = 15;

interface Props {
  onComplete: () => void;
}

export const Onboarding = ({ onComplete }: Props) => {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [course, setCourse] = useState("");
  const [saving, setSaving] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const completedRef = useRef(false);
  const lastStepRef = useRef<string>("identity");

  const nameValid = name.trim().length >= 2 && name.trim().length <= NAME_MAX;
  const courseValid = course.trim().length >= 2 && course.trim().length <= COURSE_MAX;
  const levelValid = !!level;
  const canSubmit = nameValid && levelValid && courseValid && !saving;

  // Fire onboarding_started once on mount, and detect drop-off on unmount.
  useEffect(() => {
    track("onboarding_started", { step: "identity" });
    return () => {
      if (!completedRef.current) {
        track("onboarding_step_abandoned", {
          step: lastStepRef.current,
          ms_spent: Date.now() - startedAt.current,
        });
      }
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      toast({ title: "You're not signed in", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: name.trim(),
        level,
        course_code: course.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save your details", description: error.message, variant: "destructive" });
      return;
    }
    window.dispatchEvent(new CustomEvent("profile-updated"));
    completedRef.current = true;
    track("onboarding_step_completed", { step: "identity" });
    track("onboarding_completed", {
      ms_spent: Date.now() - startedAt.current,
      level,
    });
    onComplete();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-5 pt-10 pb-4 flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Step 1 of 1</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight">
          Let's set up your <span className="text-primary">Student Identity Card</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          These details will be shown on your dashboard and can be edited later in Profile.
        </p>
      </div>

      <form onSubmit={submit} className="flex-1 flex flex-col px-5 pb-8">
        {/* Display name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5" /> Display Name
          </label>
          <div className="relative mt-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder="e.g. Olabodejuwon"
              maxLength={NAME_MAX}
              className="pr-14 h-12 rounded-xl"
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {name.length}/{NAME_MAX}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Max {NAME_MAX} characters</p>
        </div>

        {/* Level + Course side by side */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Level
            </label>
            <div className="relative mt-1">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full h-12 rounded-xl border border-input bg-background px-3 pr-9 text-sm appearance-none"
              >
                <option value="">Choose…</option>
                {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Course
            </label>
            <div className="relative mt-1">
              <Input
                value={course}
                onChange={(e) => setCourse(e.target.value.slice(0, COURSE_MAX))}
                placeholder="e.g. CSC"
                maxLength={COURSE_MAX}
                className="pr-12 h-12 rounded-xl"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {course.length}/{COURSE_MAX}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Use your course or department (e.g. CSC, Computer Science, ACC).
        </p>

        <div className="mt-6 space-y-2">
          <Hint ok={nameValid} text={`Display name (max ${NAME_MAX} characters)`} />
          <Hint ok={levelValid} text="Level selected" />
          <Hint ok={courseValid} text={`Course / Department (max ${COURSE_MAX} characters)`} />
        </div>

        <div className="flex-1" />

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-14 rounded-2xl gradient-primary text-white font-semibold text-base shadow-elevated mt-8"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
        </Button>
      </form>
    </div>
  );
};

const Hint = ({ ok, text }: { ok: boolean; text: string }) => (
  <div className="flex items-center gap-2 text-[11px]">
    <CheckCircle2 className={`h-3.5 w-3.5 ${ok ? "text-success" : "text-muted-foreground/40"}`} />
    <span className={ok ? "text-foreground" : "text-muted-foreground"}>{text}</span>
  </div>
);
