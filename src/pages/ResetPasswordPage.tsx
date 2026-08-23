import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { StatusBar } from "@/components/studymind/StatusBar";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    // Supabase recovery links put `type=recovery` in the URL hash.
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValid(true);
    } else {
      toast({ title: "Invalid or expired reset link.", variant: "destructive" });
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast({ title: "Password updated successfully." });
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to reset password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-10 text-white safe-top safe-bottom">
      <StatusBar tone="hero" />
      <div className="flex flex-col items-center mt-12">
        <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-glow">
          {done ? <CheckCircle2 className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        </div>
        <h1 className="text-2xl font-bold mt-4">{done ? "All set" : "Create new password"}</h1>
        <p className="text-white/80 text-sm text-center">
          {done
            ? "Your password has been reset."
            : valid
            ? "Enter a new password for your account."
            : "This reset link is invalid or expired."}
        </p>
      </div>

      {!done && valid && (
        <form onSubmit={submit} className="bg-card text-foreground rounded-3xl mt-8 p-6 shadow-elevated space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="New password"
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

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary font-semibold tap-scale">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
          </Button>
        </form>
      )}

      {done && (
        <div className="mt-8 p-6">
          <Button onClick={() => navigate("/auth", { replace: true })} className="w-full h-12 rounded-xl gradient-primary font-semibold tap-scale">
            Log in with new password
          </Button>
        </div>
      )}
    </div>
  );
};

export default ResetPasswordPage;
