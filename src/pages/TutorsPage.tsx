// AI Tutor catalog screen — pick a tutor by category.
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TUTORS } from "@/lib/tutors";
import { StatusBar } from "@/components/studymind/StatusBar";
import { CoinBalancePill } from "@/components/studymind/CoinBalancePill";
import { haptic } from "@/lib/haptics";

export default function TutorsPage() {
  const navigate = useNavigate();

  return (
    <div className="screen-shell pb-24">
      <StatusBar tone="background" />
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="tap-scale -ml-1 p-2 rounded-full" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold flex-1">AI Tutors</h1>
          <CoinBalancePill />
        </div>
      </header>

      <section className="px-4 pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Pick a tutor. Each one is a specialist in its field — answers are short, friendly, and on-topic.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TUTORS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { haptic("selection"); navigate(`/tutor/${t.id}`); }}
                className="text-left rounded-2xl p-4 bg-card border border-border shadow-soft tap-scale"
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${t.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm leading-tight">{t.name}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{t.subtitle}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
