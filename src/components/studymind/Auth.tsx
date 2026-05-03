import { useState } from "react";
import { GraduationCap, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(128),
});

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.5 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.7 35.6 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.365 1.43c0 1.14-.42 2.23-1.18 3.05-.83.9-2.18 1.6-3.32 1.5-.13-1.1.43-2.27 1.18-3.07.84-.91 2.27-1.59 3.32-1.48zM20.5 17.27c-.55 1.27-.82 1.84-1.53 2.96-.99 1.55-2.39 3.49-4.12 3.5-1.54.02-1.93-1-4.02-.99-2.09.01-2.52.99-4.06.98-1.73-.01-3.05-1.76-4.04-3.31C-.04 17.13-.32 11.99 1.62 9.27 3 7.34 5.18 6.2 7.23 6.2c2.09 0 3.4 1.15 5.13 1.15 1.68 0 2.7-1.15 5.12-1.15 1.83 0 3.77.99 5.16 2.7-4.53 2.48-3.79 8.95-2.14 8.37z"/>
  </svg>
);

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
        toast({ title: "Welcome to StudyMind AI!" });
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

  const oauth = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      onAuthed();
    } catch (err: any) {
      toast({ title: err?.message ?? "Sign-in failed", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-10 text-white">
      <div className="flex flex-col items-center mt-6">
        <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-glow">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mt-4">StudyMind AI</h1>
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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" disabled={loading} onClick={() => oauth("google")} className="h-12 rounded-xl tap-scale">
            <GoogleIcon /> <span className="ml-2 text-sm">Google</span>
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={() => oauth("apple")} className="h-12 rounded-xl tap-scale">
            <AppleIcon /> <span className="ml-2 text-sm">Apple</span>
          </Button>
        </div>
      </form>

      <p className="text-center text-white/70 text-xs mt-6">
        By continuing you agree to our Terms & Privacy.
      </p>
    </div>
  );
};
