import heroStudent from "@/assets/hero-student.png";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export const Splash = ({ onStart }: { onStart: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-between p-8 gradient-hero text-white relative overflow-hidden">
    <div className="absolute inset-0 opacity-30">
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute bottom-40 right-10 w-40 h-40 rounded-full bg-primary-glow/40 blur-3xl" />
    </div>

    <div className="relative z-10 mt-12 flex flex-col items-center animate-fade-in">
      <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-glow">
        <GraduationCap className="h-9 w-9 text-white" />
      </div>
    </div>

    <div className="relative z-10 flex-1 flex items-center justify-center -my-8">
      <img
        src={heroStudent}
        alt="StudyMind AI student companion"
        width={1024}
        height={1024}
        className="w-72 h-72 object-contain animate-float drop-shadow-2xl"
      />
    </div>

    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
      <h1 className="text-3xl font-bold tracking-tight">StudyMind AI</h1>
      <p className="text-white/80 text-sm max-w-xs">
        Turn your lecture notes into exam success
      </p>
    </div>

    <div className="relative z-10 w-full flex flex-col gap-3 mt-8 animate-slide-up">
      <Button
        onClick={onStart}
        size="lg"
        className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-white/95 font-semibold text-base shadow-elevated tap-scale"
      >
        Get Started
      </Button>
      <Button
        onClick={onStart}
        variant="outline"
        size="lg"
        className="w-full h-14 rounded-2xl bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white font-semibold tap-scale"
      >
        I already have an account
      </Button>
    </div>
  </div>
);
