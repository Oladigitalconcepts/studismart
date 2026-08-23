import { useState } from "react";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import { z } from "zod";
import { StatusBar } from "@/components/studymind/StatusBar";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(128),
});

interface Props { onAuthed: (opts?: { isNewUser?: boolean }) => void }

export const Auth = ({ onAuthed }: Props) => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "forgot") {
      const parsed = emailSchema.safeParse({ email });
      if (!parsed.success) {
        toast({ title: parsed.error.issues[0]?.message ?? "Invalid input", variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        track("password_reset_requested", { method: "email" });
        setForgotSent(true);
        toast({ title: "Check your email for the reset link." });
      } catch (err: any) {
        toast({ title: err?.message ?? "Failed to send reset email", variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsed = authSchema.safeParse({ email, password });
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

  const headerText = {
    login: "Welcome back",
    signup: "Create your account",
    forgot: "Reset your password",
  }[mode];

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-10 text-white safe-top safe-bottom">
      <StatusBar tone="hero" />
      <div className="flex flex-col items-center mt-6">
        <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-glow">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mt-4">Studismat</h1>
        <p className="text-white/80 text-sm">{headerText}</p>
      </div>

      <form onSubmit={submit} className="bg-card text-foreground rounded-3xl mt-8 p-6 shadow-elevated space-y-4">
        {mode !== "forgot" && (
          <div className="flex bg-secondary rounded-xl p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => { setMode(m); setForgotSent(false); }}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold capitalize ${mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => { setMode("login"); setForgotSent(false); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to log in
          </button>
        )}

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

        {mode !== "forgot" && (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10 h-12 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}

        {mode === "login" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-xs text-primary font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary font-semibold tap-scale">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "forgot" ? (forgotSent ? "Sent" : "Send reset link") : mode === "login" ? "Log in" : "Create account"}
        </Button>

        {mode === "forgot" && forgotSent && (
          <p className="text-center text-sm text-muted-foreground">
            Didn’t receive it? Check your spam folder or{" "}
            <button type="button" onClick={() => setForgotSent(false)} className="text-primary font-medium hover:underline">
              try again
            </button>
            .
          </p>
        )}
      </form>

      <p className="text-center text-white/70 text-xs mt-6">
        By continuing you agree to our Terms & Privacy.
      </p>
    </div>
  );
};
