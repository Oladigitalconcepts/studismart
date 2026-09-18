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
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Supabase recovery links arrive in one of three shapes:
    //  1. PKCE:   ?code=<uuid>
    //  2. Hash:   #access_token=...&refresh_token=...&type=recovery
    //  3. Already-established session (auth listener fired first)
    const establish = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const errDesc = url.searchParams.get("error_description") || hash.get("error_description");

      try {
        if (errDesc) throw new Error(errDesc);

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setValid(true);
          // Clean the tokens out of the address bar.
          window.history.replaceState({}, "", "/reset-password");
        } else {
          setValid(false);
          toast({ title: "This reset link is invalid or has expired.", variant: "destructive" });
        }
      } catch (e: any) {
        if (cancelled) return;
        setValid(false);
        toast({ title: e?.message ?? "This reset link is invalid or has expired.", variant: "destructive" });
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setValid(true);
        setChecking(false);
      }
    });

    establish();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast({ title: "Password updated. You can log in with it now." });
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
        <p className="text-white/80 text-sm text-center mt-1">
          {done
            ? "Your new password is saved."
            : checking
            ? "Verifying your reset link…"
            : valid
            ? "Choose a new password for your account."
            : "This reset link is invalid or expired."}
        </p>
      </div>

      {checking && !done && (
        <div className="flex justify-center mt-10">
          <Loader2 className="h-6 w-6 animate-spin text-white/80" />
        </div>
      )}

      {!done && !checking && valid && (
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

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-9 h-12 rounded-xl"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary font-semibold tap-scale">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save new password"}
          </Button>
        </form>
      )}

      {!done && !checking && !valid && (
        <div className="mt-8">
          <Button onClick={() => navigate("/auth", { replace: true })} className="w-full h-12 rounded-xl bg-card text-foreground font-semibold tap-scale hover:bg-card">
            Request a new reset link
          </Button>
        </div>
      )}

      {done && (
        <div className="mt-8">
          <Button
            onClick={async () => { await supabase.auth.signOut(); navigate("/auth", { replace: true }); }}
            className="w-full h-12 rounded-xl gradient-primary font-semibold tap-scale"
          >
            Log in with new password
          </Button>
        </div>
      )}
    </div>
  );
};

export default ResetPasswordPage;
