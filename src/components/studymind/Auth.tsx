import { useState } from "react";
import { GraduationCap, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import { z } from "zod";
import { StatusBar } from "@/components/studymind/StatusBar";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(128),
});

interface Props { onAuthed: (opts?: { isNewUser?: boolean }) => void }

export const Auth = ({ onAuthed }: Props) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0]?.message ?? "Invalid input", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        track("signup_completed", { method: "email" });
        toast({ title: "Welcome to Studismat!" });
        onAuthed({ isNewUser: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        onAuthed();
      }
    } catch (err: any) {
      toast({ title: err?.message ?? "Authentication failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-10 text-white safe-top safe-bottom">
      <StatusBar tone="hero" />
      <div className="flex flex-col items-center mt-6">
        <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-glow">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mt-4">Studismat</h1>
        <p className="text-white/80 text-sm">{mode === "login" ? "Welcome back" : "Create your account"}</p>
      </div>

      <form onSubmit={submit} className="bg-card text-foreground rounded-3xl mt-8 p-6 shadow-elevated space-y-4">
        <div className="flex bg-secondary rounded-xl p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 h-10 rounded-lg text-sm font-semibold capitalize ${mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 h-12 rounded-xl"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 h-12 rounded-xl"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary font-semibold tap-scale">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-white/70 text-xs mt-6">
        By continuing you agree to our Terms & Privacy.
      </p>
    </div>
  );
};
