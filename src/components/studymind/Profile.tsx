import { useEffect, useMemo, useState } from "react";
import {
  Settings as SettingsIcon, Flame, Award, ChevronRight, BookOpen, Layers, CheckCircle2,
  HelpCircle, LogOut, Moon, Sun, ArrowLeft, Trophy, Lock, Eye, EyeOff, Bell, Globe,
  Download, Trash2, User as UserIcon, Mail, KeyRound, MessageCircle, FileQuestion, AlertCircle,
  Sparkles, Brain, Target, Pencil,
} from "lucide-react";
import { StatusBar } from "./StatusBar";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

type SubScreen = "main" | "streak" | "achievements" | "settings" | "help" | "logout" | "password" | "notifications" | "editprofile";

const THEME_KEY = "studymind-theme";

const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
};

export const Profile = () => {
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === "dark");
  const [screen, setScreen] = useState<SubScreen>("main");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({ packs: 0, attempts: 0, correct: 0, materials: 0 });

  useEffect(() => { applyTheme(dark); }, [dark]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, course_code")
      .eq("id", user.id)
      .maybeSingle();
    setName(profile?.display_name ?? user.email?.split("@")[0] ?? "");
    setCourse(profile?.course_code ?? "");
  };

  useEffect(() => {
    (async () => {
      await loadProfile();
      const [{ count: packs }, { count: attempts }, { data: ans }, { count: materials }] = await Promise.all([
        supabase.from("study_packs").select("*", { count: "exact", head: true }),
        supabase.from("practice_attempts").select("*", { count: "exact", head: true }),
        supabase.from("answer_attempts").select("is_correct"),
        supabase.from("materials").select("*", { count: "exact", head: true }),
      ]);
      const correct = (ans ?? []).filter((a) => a.is_correct).length;
      setStats({ packs: packs ?? 0, attempts: attempts ?? 0, correct, materials: materials ?? 0 });
    })();
  }, []);

  const initials = (name || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  if (screen === "streak") return <StreakScreen onBack={() => setScreen("main")} />;
  if (screen === "achievements") return <AchievementsScreen onBack={() => setScreen("main")} correct={stats.correct} packs={stats.packs} materials={stats.materials} />;
  if (screen === "settings") return <SettingsScreen onBack={() => setScreen("main")} dark={dark} setDark={setDark} onPassword={() => setScreen("password")} onNotifications={() => setScreen("notifications")} onEditProfile={() => setScreen("editprofile")} />;
  if (screen === "help") return <HelpScreen onBack={() => setScreen("main")} />;
  if (screen === "password") return <PasswordScreen onBack={() => setScreen("settings")} />;
  if (screen === "notifications") return <NotificationsScreen onBack={() => setScreen("settings")} />;
  if (screen === "editprofile") return <EditProfileScreen onBack={() => setScreen("settings")} initialName={name} initialCourse={course} email={email} onSaved={loadProfile} />;
  if (screen === "logout") return <LogoutScreen onCancel={() => setScreen("main")} />;

  const items = [
    { label: "Study Streak", value: "—", icon: Flame, color: "text-orange-500", onClick: () => setScreen("streak") },
    { label: "Achievements", value: `${Math.floor(stats.correct / 10)} badges`, icon: Award, color: "text-amber-500", onClick: () => setScreen("achievements") },
    { label: "Settings", icon: SettingsIcon, color: "text-primary", onClick: () => setScreen("settings") },
    { label: "Help & Support", icon: HelpCircle, color: "text-blue-500", onClick: () => setScreen("help") },
  ];

  return (
    <div className="animate-fade-in">
      <StatusBar />

      <div className="relative mx-5 mt-3 rounded-3xl gradient-hero p-6 text-white shadow-elevated overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <button
          onClick={() => setDark((d) => !d)}
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center tap-scale"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-2xl font-bold ring-4 ring-white/20 relative">
            {initials}
            <button className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-primary flex items-center justify-center shadow-md tap-scale" aria-label="Edit avatar">
              <Pencil className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg leading-tight truncate">{name || "Student"}</h2>
            <p className="text-white/80 text-sm truncate">{email}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-2 mt-6">
          {[
            { label: "Study Packs", value: stats.packs, icon: Layers },
            { label: "Sessions", value: stats.attempts, icon: BookOpen },
            { label: "Correct", value: stats.correct, icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/15 backdrop-blur-sm p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-white/80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-2">
        {items.map((item) => (
          <button key={item.label} onClick={item.onClick} className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
        <button
          onClick={() => setScreen("logout")}
          className="w-full p-4 rounded-2xl bg-card border border-border flex items-center gap-3 tap-scale"
        >
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
            <LogOut className="h-5 w-5 text-destructive" />
          </div>
          <span className="flex-1 text-left text-sm font-medium">Log out</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

/* ---------- Sub-screens ---------- */

const SubHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <>
    <StatusBar />
    <div className="flex items-center px-5 pt-2 pb-4 relative">
      <button onClick={onBack} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center tap-scale" aria-label="Back">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-base">{title}</h1>
    </div>
  </>
);

const StreakScreen = ({ onBack }: { onBack: () => void }) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay(); // 0 Sun .. 6 Sat
  const todayIdx = today === 0 ? 6 : today - 1;
  return (
    <div className="animate-fade-in">
      <SubHeader title="Study Streak" onBack={onBack} />
      <div className="px-5">
        <div className="flex flex-col items-center py-6">
          <div className="h-28 w-28 rounded-full bg-orange-500/15 flex items-center justify-center">
            <Flame className="h-14 w-14 text-orange-500" />
          </div>
          <p className="mt-4 text-3xl font-bold">7 days</p>
          <p className="text-sm text-muted-foreground">Keep it up! 🔥</p>
          <p className="text-xs text-muted-foreground mt-1">Study every day to keep your streak alive.</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex justify-between">
            {days.map((d, i) => {
              const done = i <= todayIdx;
              const isToday = i === todayIdx;
              return (
                <div key={d} className="flex flex-col items-center gap-2">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"} ${isToday ? "ring-2 ring-primary/40" : ""}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Longest Streak</p>
            <p className="text-xs text-muted-foreground">14 days</p>
          </div>
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold">Streak Tips</h3>
        <div className="rounded-2xl bg-card border border-border p-4 flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Consistency beats intensity</p>
            <p className="text-xs text-muted-foreground">Study a little every day.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AchievementsScreen = ({ onBack, correct, packs, materials }: { onBack: () => void; correct: number; packs: number; materials: number }) => {
  const badges = useMemo(() => ([
    { id: "first", title: "First Steps", desc: "Complete your first practice", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", earned: correct > 0 },
    { id: "streak", title: "7 Day Streak", desc: "Study 7 days in a row", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10", earned: false },
    { id: "quiz", title: "Quiz Master", desc: "Answer 100 questions", icon: Target, color: "text-primary", bg: "bg-primary-soft", earned: correct >= 100, progress: `${Math.min(correct, 100)}/100` },
    { id: "explorer", title: "Material Explorer", desc: "Upload your first material", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10", earned: materials > 0 },
    { id: "perf", title: "Top Performer", desc: "Score 90% or higher in a quiz", icon: Trophy, color: "text-emerald-500", bg: "bg-emerald-500/10", earned: false },
    { id: "scholar", title: "Scholar", desc: "Create 10 study packs", icon: Layers, color: "text-violet-500", bg: "bg-violet-500/10", earned: packs >= 10, progress: `${Math.min(packs, 10)}/10` },
  ]), [correct, packs, materials]);

  const earned = badges.filter((b) => b.earned).length;
  const [tab, setTab] = useState<"all" | "earned" | "locked">("all");
  const filtered = badges.filter((b) => tab === "all" || (tab === "earned" ? b.earned : !b.earned));

  return (
    <div className="animate-fade-in">
      <SubHeader title="Achievements" onBack={onBack} />
      <div className="px-5">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Your Progress</p>
            <p className="text-2xl font-bold mt-1">{earned} / {badges.length}</p>
            <p className="text-xs text-muted-foreground">Badges Earned</p>
            <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: `${(earned / badges.length) * 100}%` }} />
            </div>
          </div>
          <div className="h-16 w-16 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Award className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-secondary p-1">
          {(["all", "earned", "locked"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`py-2 text-xs font-semibold rounded-xl capitalize transition-base ${tab === t ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2 pb-4">
          {filtered.map((b) => (
            <div key={b.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl ${b.bg} flex items-center justify-center ${!b.earned ? "opacity-60" : ""}`}>
                <b.icon className={`h-6 w-6 ${b.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground truncate">{b.desc}</p>
                {b.progress && !b.earned && <p className="text-[10px] text-muted-foreground mt-0.5">{b.progress}</p>}
              </div>
              {b.earned ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsScreen = ({ onBack, dark, setDark, onPassword, onNotifications, onEditProfile }: { onBack: () => void; dark: boolean; setDark: (v: boolean) => void; onPassword: () => void; onNotifications: () => void; onEditProfile: () => void }) => {
  return (
    <div className="animate-fade-in">
      <SubHeader title="Settings" onBack={onBack} />
      <div className="px-5 space-y-6 pb-6">
        <Section title="Account">
          <Row icon={UserIcon} label="Edit Profile" onClick={onEditProfile} />
          <Row icon={KeyRound} label="Change Password" onClick={onPassword} />
          <Row icon={Mail} label="Email Preferences" onClick={() => toast({ title: "Coming soon" })} />
        </Section>

        <Section title="App Preferences">
          <ToggleRow icon={Moon} label="Dark Mode" checked={dark} onChange={setDark} />
          <Row icon={Bell} label="Notifications" onClick={onNotifications} />
          <Row icon={Globe} label="Language" trailing={<span className="text-xs text-muted-foreground">English</span>} onClick={() => toast({ title: "Coming soon" })} />
        </Section>

        <Section title="Data & Storage">
          <Row icon={Download} label="Download Management" onClick={() => toast({ title: "Coming soon" })} />
          <Row icon={Trash2} label="Clear Cache" trailing={<span className="text-xs text-muted-foreground">21.4 MB</span>} onClick={() => { toast({ title: "Cache cleared" }); }} />
        </Section>

        <Section title="About">
          <Row icon={AlertCircle} label="Version" trailing={<span className="text-xs text-muted-foreground">1.0.0</span>} />
        </Section>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{title}</h3>
    <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">{children}</div>
  </div>
);

const Row = ({ icon: Icon, label, trailing, onClick }: { icon: any; label: string; trailing?: React.ReactNode; onClick?: () => void }) => (
  <button onClick={onClick} className="w-full px-4 py-3 flex items-center gap-3 tap-scale text-left">
    <Icon className="h-5 w-5 text-primary" />
    <span className="flex-1 text-sm font-medium">{label}</span>
    {trailing}
    {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
  </button>
);

const ToggleRow = ({ icon: Icon, label, checked, onChange }: { icon: any; label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="w-full px-4 py-3 flex items-center gap-3">
    <Icon className="h-5 w-5 text-primary" />
    <span className="flex-1 text-sm font-medium">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const HelpScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="animate-fade-in">
    <SubHeader title="Help & Support" onBack={onBack} />
    <div className="px-5">
      <div className="flex flex-col items-center py-6">
        <div className="h-24 w-24 rounded-full bg-primary-soft flex items-center justify-center">
          <HelpCircle className="h-12 w-12 text-primary" />
        </div>
        <p className="mt-4 text-lg font-bold">We're here to help!</p>
        <p className="text-xs text-muted-foreground text-center mt-1 max-w-xs">Find answers or reach out to our support team.</p>
      </div>

      <div className="space-y-2">
        <Row icon={FileQuestion} label="FAQs" onClick={() => toast({ title: "Coming soon" })} />
        <Row icon={MessageCircle} label="Contact Support" onClick={() => toast({ title: "Email us at help@studymind.app" })} />
        <Row icon={AlertCircle} label="Report a Problem" onClick={() => toast({ title: "Coming soon" })} />
        <Row icon={Sparkles} label="Feedback & Suggestions" onClick={() => toast({ title: "Coming soon" })} />
      </div>

      <div className="mt-6 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Response Time</p>
          <p className="text-xs text-muted-foreground">We typically reply within 24 hours</p>
        </div>
      </div>
    </div>
  </div>
);

const passwordSchema = (current: string) =>
  z.object({
    c: z.string().min(1, "Enter your current password"),
    n: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "Must be 72 characters or fewer")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[0-9!@#$%^&*]/, "Must include a number or symbol")
      .refine((v) => v !== current, "New password must differ from current"),
    conf: z.string(),
  }).refine((d) => d.n === d.conf, { message: "Passwords don't match", path: ["conf"] });

const PasswordScreen = ({ onBack }: { onBack: () => void }) => {
  const [show, setShow] = useState({ c: false, n: false, conf: false });
  const [vals, setVals] = useState({ c: "", n: "", conf: "" });
  const [errors, setErrors] = useState<{ c?: string; n?: string; conf?: string; form?: string }>({});
  const [touched, setTouched] = useState<{ c?: boolean; n?: boolean; conf?: boolean }>({});
  const [loading, setLoading] = useState(false);

  const checks = {
    len: vals.n.length >= 8,
    upper: /[A-Z]/.test(vals.n),
    num: /[0-9!@#$%^&*]/.test(vals.n),
  };

  const validate = () => {
    const result = passwordSchema(vals.c).safeParse(vals);
    if (result.success) { setErrors({}); return true; }
    const fieldErrors: typeof errors = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as "c" | "n" | "conf";
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  };

  const onChange = (k: "c" | "n" | "conf") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...vals, [k]: e.target.value };
    setVals(next);
    if (touched[k] || errors[k] || errors.form) {
      const result = passwordSchema(next.c).safeParse(next);
      if (result.success) setErrors((prev) => ({ ...prev, [k]: undefined, form: undefined }));
      else {
        const fieldErr = result.error.issues.find((i) => i.path[0] === k)?.message;
        setErrors((prev) => ({ ...prev, [k]: fieldErr, form: undefined }));
      }
    }
  };

  const onBlur = (k: "c" | "n" | "conf") => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    validate();
  };

  const update = async () => {
    setTouched({ c: true, n: true, conf: true });
    if (!validate()) return;
    setLoading(true);
    setErrors((e) => ({ ...e, form: undefined }));

    // Verify current password via reauth attempt
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setLoading(false);
      setErrors((e) => ({ ...e, form: "You're not signed in" }));
      return;
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: vals.c,
    });
    if (verifyError) {
      setLoading(false);
      setErrors((e) => ({ ...e, c: "Current password is incorrect" }));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: vals.n });
    setLoading(false);
    if (error) {
      setErrors((e) => ({ ...e, form: error.message }));
      return;
    }
    toast({ title: "Password updated successfully" });
    onBack();
  };

  const fields = [
    { k: "c" as const, label: "Current Password" },
    { k: "n" as const, label: "New Password" },
    { k: "conf" as const, label: "Confirm New Password" },
  ];

  const isValid = !Object.values(errors).some(Boolean) && vals.c && vals.n && vals.conf;

  return (
    <div className="animate-fade-in">
      <SubHeader title="Change Password" onBack={onBack} />
      <div className="px-5">
        <div className="flex justify-center py-4">
          <div className="h-20 w-20 rounded-full bg-primary-soft flex items-center justify-center">
            <Lock className="h-10 w-10 text-primary" />
          </div>
        </div>

        {fields.map((f) => {
          const err = errors[f.k];
          return (
            <div key={f.k} className="mb-4">
              <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
              <div className="relative mt-1">
                <Input
                  type={show[f.k] ? "text" : "password"}
                  value={vals[f.k]}
                  onChange={onChange(f.k)}
                  onBlur={onBlur(f.k)}
                  placeholder={`Enter ${f.label.toLowerCase()}`}
                  aria-invalid={!!err}
                  aria-describedby={err ? `${f.k}-err` : undefined}
                  className={`pr-10 ${err ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [f.k]: !s[f.k] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Toggle visibility"
                >
                  {show[f.k] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {err && (
                <p id={`${f.k}-err`} className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {err}
                </p>
              )}
            </div>
          );
        })}

        <div className="rounded-2xl bg-card border border-border p-4 space-y-1.5">
          <p className="text-xs font-semibold mb-1">Password must contain:</p>
          {[
            { ok: checks.len, label: "At least 8 characters" },
            { ok: checks.upper, label: "One uppercase letter" },
            { ok: checks.num, label: "One number or symbol" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className={`h-4 w-4 ${c.ok ? "text-success" : "text-muted-foreground"}`} />
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </div>
          ))}
        </div>

        {errors.form && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{errors.form}</p>
          </div>
        )}

        <Button
          onClick={update}
          disabled={loading || !isValid}
          className="w-full mt-6 h-12 rounded-2xl gradient-primary text-white font-semibold disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </div>
  );
};

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "At least 2 characters").max(60, "Must be 60 characters or fewer"),
  course_code: z
    .string()
    .trim()
    .max(20, "Must be 20 characters or fewer")
    .regex(/^[A-Za-z0-9 \-]*$/, "Letters, numbers, spaces, and hyphens only")
    .optional()
    .or(z.literal("")),
});

const EditProfileScreen = ({
  onBack, initialName, initialCourse, email, onSaved,
}: { onBack: () => void; initialName: string; initialCourse: string; email: string; onSaved: () => void | Promise<void> }) => {
  const [displayName, setDisplayName] = useState(initialName);
  const [courseCode, setCourseCode] = useState(initialCourse);
  const [errors, setErrors] = useState<{ display_name?: string; course_code?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  const dirty = displayName !== initialName || courseCode !== initialCourse;

  const validate = () => {
    const result = profileSchema.safeParse({ display_name: displayName, course_code: courseCode });
    if (result.success) { setErrors({}); return true; }
    const next: typeof errors = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as "display_name" | "course_code";
      if (k && !next[k]) next[k] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrors((e) => ({ ...e, form: undefined }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setErrors({ form: "You're not signed in" });
      return;
    }
    const payload = {
      id: user.id,
      display_name: displayName.trim(),
      course_code: courseCode.trim() ? courseCode.trim().toUpperCase() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    toast({ title: "Profile updated" });
    await onSaved();
    onBack();
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Edit Profile" onBack={onBack} />
      <div className="px-5">
        <div className="flex justify-center py-4">
          <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-glow">
            {(displayName || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground">Display Name</label>
          <Input
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); if (errors.display_name) setErrors((p) => ({ ...p, display_name: undefined })); }}
            onBlur={validate}
            placeholder="e.g. Fayo Adeyemi"
            maxLength={60}
            aria-invalid={!!errors.display_name}
            className={`mt-1 ${errors.display_name ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
          />
          {errors.display_name && (
            <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.display_name}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground">Course Code</label>
          <Input
            value={courseCode}
            onChange={(e) => { setCourseCode(e.target.value); if (errors.course_code) setErrors((p) => ({ ...p, course_code: undefined })); }}
            onBlur={validate}
            placeholder="e.g. CSC101"
            maxLength={20}
            aria-invalid={!!errors.course_code}
            className={`mt-1 uppercase ${errors.course_code ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
          />
          {errors.course_code ? (
            <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.course_code}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">Your primary course or programme</p>
          )}
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground">Email</label>
          <Input value={email} disabled readOnly className="mt-1 bg-muted text-muted-foreground" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">Email can't be changed here</p>
        </div>

        {errors.form && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{errors.form}</p>
          </div>
        )}

        <Button
          onClick={save}
          disabled={saving || !dirty}
          className="w-full mt-6 h-12 rounded-2xl gradient-primary text-white font-semibold disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

const NotificationsScreen = ({ onBack }: { onBack: () => void }) => {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studymind-notif") || "{}"); } catch { return {}; }
  });
  const set = (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    localStorage.setItem("studymind-notif", JSON.stringify(next));
  };
  const get = (k: string, def = true) => prefs[k] ?? def;

  return (
    <div className="animate-fade-in">
      <SubHeader title="Notifications" onBack={onBack} />
      <div className="px-5 space-y-6 pb-6">
        <Section title="">
          <ToggleRow icon={Bell} label="Push Notifications" checked={get("push")} onChange={(v) => set("push", v)} />
        </Section>

        <Section title="Notify me about">
          <ToggleRow icon={Flame} label="Daily Reminders" checked={get("daily")} onChange={(v) => set("daily", v)} />
          <ToggleRow icon={Sparkles} label="New Content" checked={get("content")} onChange={(v) => set("content", v)} />
          <ToggleRow icon={Award} label="Achievements" checked={get("ach")} onChange={(v) => set("ach", v)} />
          <ToggleRow icon={Brain} label="Tips & Updates" checked={get("tips", false)} onChange={(v) => set("tips", v)} />
        </Section>

        <Section title="Quiet Hours">
          <Row icon={Moon} label="From" trailing={<span className="text-xs text-muted-foreground">10:00 PM</span>} onClick={() => toast({ title: "Coming soon" })} />
          <Row icon={Sun} label="To" trailing={<span className="text-xs text-muted-foreground">7:00 AM</span>} onClick={() => toast({ title: "Coming soon" })} />
          <ToggleRow icon={Bell} label="No notifications during quiet hours" checked={get("quiet")} onChange={(v) => set("quiet", v)} />
        </Section>
      </div>
    </div>
  );
};

const LogoutScreen = ({ onCancel }: { onCancel: () => void }) => {
  const [loading, setLoading] = useState(false);
  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };
  return (
    <div className="animate-fade-in">
      <SubHeader title="Log Out" onBack={onCancel} />
      <div className="px-5 flex flex-col items-center pt-8">
        <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
          <LogOut className="h-12 w-12 text-destructive" />
        </div>
        <p className="mt-6 text-xl font-bold text-center">Are you sure you want to log out?</p>
        <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">You'll need to sign in again to access your account.</p>

        <div className="w-full mt-10 space-y-2">
          <Button onClick={signOut} disabled={loading} className="w-full h-12 rounded-2xl gradient-primary text-white font-semibold">
            {loading ? "Logging out..." : "Log Out"}
          </Button>
          <Button onClick={onCancel} variant="ghost" className="w-full h-12 rounded-2xl text-primary font-semibold">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
