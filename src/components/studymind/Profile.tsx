import { AvatarImg } from "@/components/studymind/AvatarImg";
import { toAvatarPath } from "@/lib/avatars";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings as SettingsIcon, Flame, Award, ChevronRight, BookOpen, Layers, CheckCircle2,
  HelpCircle, LogOut, Moon, Sun, ArrowLeft, Trophy, Lock, Eye, EyeOff, Bell, Globe,
  Download, Trash2, User as UserIcon, Mail, KeyRound, MessageCircle, FileQuestion, AlertCircle,
  Sparkles, Brain, Target, Pencil, FileText, HardDrive, Loader2,
} from "lucide-react";
import { StatusBar } from "./StatusBar";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authUser";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { cacheClearForUser } from "@/lib/offlineCache";
import { computeStreak, type StreakInfo } from "@/lib/notifications";
import { useWallet } from "@/hooks/useWallet";
import { triggerDailyLogin } from "@/lib/missions";

type SubScreen =
  | "main" | "streak" | "achievements" | "settings" | "help" | "logout"
  | "password" | "notifications" | "editprofile"
  | "email" | "language" | "downloads";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ packs: 0, attempts: 0, correct: 0, materials: 0 });
  const [streak, setStreak] = useState<StreakInfo>({ current: 0, longest: 0, studiedToday: false });
  const [studiedDays, setStudiedDays] = useState<Set<string>>(new Set());
  const { wallet, refresh: refreshWallet } = useWallet();

  useEffect(() => { applyTheme(dark); }, [dark]);

  // Reset to main when the Profile tab is re-tapped in the bottom nav.
  useEffect(() => {
    const onReset = (e: Event) => {
      const detail = (e as CustomEvent<{ tab: string }>).detail;
      if (detail?.tab === "profile") setScreen("main");
    };
    window.addEventListener("bottom-nav-reset", onReset as EventListener);
    return () => window.removeEventListener("bottom-nav-reset", onReset as EventListener);
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await getCurrentUser();
    if (!user) return;
    setEmail(user.email ?? "");
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, course_code, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    setName(profile?.display_name ?? user.email?.split("@")[0] ?? "");
    setCourse(profile?.course_code ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  };

  useEffect(() => {
    (async () => {
      await loadProfile();
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const [{ count: packs }, { count: attempts }, { data: ans }, { count: materials }, { data: recent }] = await Promise.all([
        supabase.from("study_packs").select("*", { count: "exact", head: true }),
        supabase.from("practice_attempts").select("*", { count: "exact", head: true }),
        supabase.from("answer_attempts").select("is_correct"),
        supabase.from("materials").select("*", { count: "exact", head: true }),
        supabase.from("practice_attempts").select("finished_at").gte("finished_at", since.toISOString()),
      ]);
      const correct = (ans ?? []).filter((a) => a.is_correct).length;
      setStats({ packs: packs ?? 0, attempts: attempts ?? 0, correct, materials: materials ?? 0 });
      const days = new Set<string>();
      (recent ?? []).forEach((r) => {
        const d = new Date(r.finished_at);
        days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      });
      setStudiedDays(days);
      const s = await computeStreak();
      setStreak(s);
    })();
  }, []);

  useEffect(() => {
    const onUpdate = () => { void loadProfile(); };
    window.addEventListener("profile-updated", onUpdate);
    return () => window.removeEventListener("profile-updated", onUpdate);
  }, []);

  const initials = (name || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  // Compute earned badges count using the same definitions as the Achievements screen.
  const badgesEarned = useMemo(() => computeEarnedBadges({
    correct: stats.correct,
    packs: stats.packs,
    materials: stats.materials,
    streakCurrent: streak.current,
    streakLongest: streak.longest,
  }), [stats, streak]);

  if (screen === "streak") return <StreakScreen onBack={() => setScreen("main")} streak={streak} studiedDays={studiedDays} walletStreak={wallet?.streak_days ?? 0} lastLoginDate={wallet?.last_login_date ?? null} onCheckedIn={refreshWallet} />;
  if (screen === "achievements") return <AchievementsScreen onBack={() => setScreen("main")} correct={stats.correct} packs={stats.packs} materials={stats.materials} streakCurrent={streak.current} streakLongest={streak.longest} />;
  if (screen === "settings") return <SettingsScreen onBack={() => setScreen("main")} dark={dark} setDark={setDark} onPassword={() => setScreen("password")} onNotifications={() => setScreen("notifications")} onEditProfile={() => setScreen("editprofile")} onEmail={() => setScreen("email")} onLanguage={() => setScreen("language")} onDownloads={() => setScreen("downloads")} />;
  if (screen === "help") return <HelpScreen onBack={() => setScreen("main")} />;
  if (screen === "password") return <PasswordScreen onBack={() => setScreen("settings")} />;
  if (screen === "notifications") return <NotificationsScreen onBack={() => setScreen("settings")} />;
  if (screen === "editprofile") return <EditProfileScreen onBack={() => setScreen("settings")} initialName={name} initialCourse={course} initialAvatarUrl={avatarUrl} email={email} onSaved={loadProfile} />;
  if (screen === "email") return <EmailPreferencesScreen onBack={() => setScreen("settings")} />;
  if (screen === "language") return <LanguageScreen onBack={() => setScreen("settings")} />;
  if (screen === "downloads") return <DownloadManagementScreen onBack={() => setScreen("settings")} />;
  if (screen === "logout") return <LogoutScreen onCancel={() => setScreen("main")} />;

  const items = [
    { label: "Study Streak", value: `${wallet?.streak_days ?? 0} day${(wallet?.streak_days ?? 0) === 1 ? "" : "s"}`, icon: Flame, color: "text-orange-500", onClick: () => setScreen("streak") },
    { label: "Achievements", value: `${badgesEarned} badge${badgesEarned === 1 ? "" : "s"}`, icon: Award, color: "text-amber-500", onClick: () => setScreen("achievements") },
    { label: "Settings", icon: SettingsIcon, color: "text-primary", onClick: () => setScreen("settings") },
    { label: "Help & Support", icon: HelpCircle, color: "text-blue-500", onClick: () => setScreen("help") },
  ];

  return (
    <div className="animate-fade-in">
      <StatusBar tone="background" />

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
          <div className="h-16 w-16 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-2xl font-bold ring-4 ring-white/20 relative overflow-hidden">
            {avatarUrl ? (
              <AvatarImg value={avatarUrl} alt={name || "Profile"} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
            <button
              onClick={() => setScreen("editprofile")}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-primary flex items-center justify-center shadow-md tap-scale z-10"
              aria-label="Edit avatar"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg leading-tight truncate">{name || "Student"}</h2>
            {course && <p className="text-white/90 text-xs font-medium truncate">{course}</p>}
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

/* ---------- Achievement definitions (shared between profile + screen) ---------- */

interface BadgeStats {
  correct: number;
  packs: number;
  materials: number;
  streakCurrent: number;
  streakLongest: number;
}

const badgeDefs = (s: BadgeStats) => [
  { id: "first", title: "First Steps", desc: "Complete your first practice", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", earned: s.correct > 0 },
  { id: "streak", title: "7 Day Streak", desc: "Study 7 days in a row", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10", earned: s.streakLongest >= 7, progress: `${Math.min(s.streakLongest, 7)}/7` },
  { id: "quiz", title: "Quiz Master", desc: "Answer 100 questions", icon: Target, color: "text-primary", bg: "bg-primary-soft", earned: s.correct >= 100, progress: `${Math.min(s.correct, 100)}/100` },
  { id: "explorer", title: "Material Explorer", desc: "Upload your first material", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10", earned: s.materials > 0 },
  { id: "perf", title: "On Fire", desc: "Reach a 3-day streak", icon: Trophy, color: "text-emerald-500", bg: "bg-emerald-500/10", earned: s.streakLongest >= 3, progress: `${Math.min(s.streakLongest, 3)}/3` },
  { id: "scholar", title: "Scholar", desc: "Create 10 study packs", icon: Layers, color: "text-violet-500", bg: "bg-violet-500/10", earned: s.packs >= 10, progress: `${Math.min(s.packs, 10)}/10` },
];

const computeEarnedBadges = (s: BadgeStats): number =>
  badgeDefs(s).filter((b) => b.earned).length;

const StreakScreen = ({ onBack, streak, studiedDays, walletStreak, lastLoginDate, onCheckedIn }: { onBack: () => void; streak: StreakInfo; studiedDays: Set<string>; walletStreak: number; lastLoginDate: string | null; onCheckedIn: () => void }) => {
  const [checking, setChecking] = useState(false);
  const todayKey = new Date().toISOString().slice(0, 10);
  const checkedToday = lastLoginDate === todayKey;
  const checkIn = async () => {
    if (checking || checkedToday) return;
    setChecking(true);
    try {
      await triggerDailyLogin();
      await onCheckedIn();
      toast({ title: "+5 coins", description: "Study streak checked in for today." });
    } catch (e: any) {
      toast({ title: "Could not check in", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();
  const jsDay = today.getDay(); // 0 Sun .. 6 Sat
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  // Build the date for each weekday in the current week (Mon-first).
  const weekDates: Date[] = days.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (i - todayIdx));
    return d;
  });
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  return (
    <div className="animate-fade-in">
      <SubHeader title="Study Streak" onBack={onBack} />
      <div className="px-5">
        <div className="flex flex-col items-center py-6">
          <div className="h-28 w-28 rounded-full bg-orange-500/15 flex items-center justify-center">
            <Flame className="h-14 w-14 text-orange-500" />
          </div>
          <p className="mt-4 text-3xl font-bold">{walletStreak} day{walletStreak === 1 ? "" : "s"}</p>
          <p className="text-sm text-muted-foreground">
            {checkedToday ? "Checked in today! 🔥" : walletStreak > 0 ? "Check in today to keep your streak!" : "Start your streak today 🚀"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Resets at 12 AM every day.</p>
          <button onClick={checkIn} disabled={checking || checkedToday} className="mt-4 rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-bold tap-scale disabled:opacity-60">
            {checkedToday ? "Checked In" : checking ? "Checking…" : "Check In Today"}
          </button>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex justify-between">
            {days.map((d, i) => {
              const date = weekDates[i];
              const isFuture = date.getTime() > today.getTime() && i !== todayIdx;
              const done = !isFuture && studiedDays.has(dayKey(date));
              const isToday = i === todayIdx;
              return (
                <div key={d} className="flex flex-col items-center gap-2">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"} ${isToday ? "ring-2 ring-primary/40" : ""}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : date.getDate()}
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
            <p className="text-xs text-muted-foreground">{Math.max(streak.longest, walletStreak)} day{Math.max(streak.longest, walletStreak) === 1 ? "" : "s"}</p>
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

const AchievementsScreen = ({ onBack, correct, packs, materials, streakCurrent, streakLongest }: { onBack: () => void; correct: number; packs: number; materials: number; streakCurrent: number; streakLongest: number }) => {
  const badges = useMemo(
    () => badgeDefs({ correct, packs, materials, streakCurrent, streakLongest }),
    [correct, packs, materials, streakCurrent, streakLongest],
  );

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

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
  { code: "yo", label: "Yorùbá" },
  { code: "ig", label: "Igbo" },
  { code: "ha", label: "Hausa" },
  { code: "sw", label: "Kiswahili" },
];

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const measureCacheBytes = (): number => {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("studymind-cache-")) continue;
      const v = localStorage.getItem(k) ?? "";
      // Approximate UTF-16 storage: 2 bytes per char (key + value).
      total += (k.length + v.length) * 2;
    }
  } catch { /* noop */ }
  return total;
};

const SettingsScreen = ({
  onBack, dark, setDark,
  onPassword, onNotifications, onEditProfile,
  onEmail, onLanguage, onDownloads,
}: {
  onBack: () => void; dark: boolean; setDark: (v: boolean) => void;
  onPassword: () => void; onNotifications: () => void; onEditProfile: () => void;
  onEmail: () => void; onLanguage: () => void; onDownloads: () => void;
}) => {
  const [langCode, setLangCode] = useState<string>("en");
  const [cacheBytes, setCacheBytes] = useState<number>(0);
  const [clearing, setClearing] = useState(false);

  const loadLanguage = async () => {
    const { data: { user } } = await getCurrentUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles").select("language").eq("id", user.id).maybeSingle();
    if (data?.language) setLangCode(data.language);
  };

  useEffect(() => {
    setCacheBytes(measureCacheBytes());
    void loadLanguage();
    const onUpdate = () => { void loadLanguage(); setCacheBytes(measureCacheBytes()); };
    window.addEventListener("profile-updated", onUpdate);
    return () => window.removeEventListener("profile-updated", onUpdate);
  }, []);

  const langLabel = LANGUAGES.find((l) => l.code === langCode)?.label ?? "English";

  const clearCache = async () => {
    setClearing(true);
    const { data: { user } } = await getCurrentUser();
    cacheClearForUser(user?.id ?? null);
    cacheClearForUser(null);
    setCacheBytes(measureCacheBytes());
    setClearing(false);
    toast({ title: "Cache cleared", description: "Offline data has been removed from this device." });
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Settings" onBack={onBack} />
      <div className="px-5 space-y-6 pb-6">
        <Section title="Account">
          <Row icon={UserIcon} label="Edit Profile" onClick={onEditProfile} />
          <Row icon={KeyRound} label="Change Password" onClick={onPassword} />
          <Row icon={Mail} label="Email Preferences" onClick={onEmail} />
        </Section>

        <Section title="App Preferences">
          <ToggleRow icon={Moon} label="Dark Mode" checked={dark} onChange={setDark} />
          <Row icon={Bell} label="Notifications" onClick={onNotifications} />
          <Row icon={Globe} label="Language" trailing={<span className="text-xs text-muted-foreground">{langLabel}</span>} onClick={onLanguage} />
        </Section>

        <Section title="Data & Storage">
          <Row icon={Download} label="Download Management" onClick={onDownloads} />
          <Row
            icon={Trash2}
            label={clearing ? "Clearing…" : "Clear Cache"}
            trailing={<span className="text-xs text-muted-foreground">{formatBytes(cacheBytes)}</span>}
            onClick={clearing ? undefined : clearCache}
          />
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

const HelpScreen = ({ onBack }: { onBack: () => void }) => {
  const [openBox, setOpenBox] = useState(false);
  const [message, setMessage] = useState("");
  const supportEmail = "nexolabsa@gmail.com";
  const whatsappUrl = "https://wa.me/2349055910583";
  const sendFeedback = () => {
    const body = encodeURIComponent(message.trim() || "I have a suggestion/feedback for Studismart.");
    window.location.href = `mailto:${supportEmail}?subject=Suggestion%20and%20Feedback&body=${body}`;
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Help & Support" onBack={onBack} />
      <div className="px-5">
        <div className="flex flex-col items-center py-6">
          <div className="h-24 w-24 rounded-full bg-primary-soft flex items-center justify-center">
            <HelpCircle className="h-12 w-12 text-primary" />
          </div>
          <p className="mt-4 text-lg font-bold">We're here to help!</p>
          <p className="text-xs text-muted-foreground text-center mt-1 max-w-xs">Reach support by WhatsApp, email, or send feedback.</p>
        </div>

        <div className="space-y-2">
          <Row icon={MessageCircle} label="WhatsApp Support" onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")} />
          <Row icon={Mail} label="Email Support" onClick={() => { window.location.href = `mailto:${supportEmail}`; }} />
          <Row icon={AlertCircle} label="Report a Problem" onClick={() => setOpenBox(true)} />
          <Row icon={Sparkles} label="Suggestions & Feedback" onClick={() => setOpenBox(true)} />
        </div>

        {openBox && (
          <div className="mt-4 rounded-2xl bg-card border border-border p-4">
            <p className="text-sm font-semibold">Suggestion / Feedback</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-3 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Type your message here..."
            />
            <div className="mt-3 flex gap-2">
              <button onClick={sendFeedback} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold tap-scale">Send</button>
              <button onClick={() => setOpenBox(false)} className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 text-sm font-bold tap-scale">Cancel</button>
            </div>
          </div>
        )}

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
};

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
    const { data: { user } } = await getCurrentUser();
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

// Normalize a raw course code: uppercase, strip spaces, collapse repeats.
const normalizeCourseCode = (raw: string): string =>
  raw.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

// Pull plausible course codes out of a free-text title, e.g. "CSC101", "MATH-204".
const COURSE_CODE_PATTERN = /\b([A-Z]{2,5})[\s-]?(\d{2,4}[A-Z]?)\b/g;
const extractCourseCodes = (text: string): string[] => {
  if (!text) return [];
  const out: string[] = [];
  for (const m of text.toUpperCase().matchAll(COURSE_CODE_PATTERN)) {
    out.push(`${m[1]}${m[2]}`);
  }
  return out;
};

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "At least 2 characters").max(60, "Must be 60 characters or fewer"),
  course_code: z
    .string()
    .trim()
    .max(15, "Must be 15 characters or fewer")
    .optional()
    .or(z.literal("")),
});

const EditProfileScreen = ({
  onBack, initialName, initialCourse, initialAvatarUrl, email, onSaved,
}: {
  onBack: () => void;
  initialName: string;
  initialCourse: string;
  initialAvatarUrl: string | null;
  email: string;
  onSaved: () => void | Promise<void>;
}) => {
  const [displayName, setDisplayName] = useState(initialName);
  const [courseCode, setCourseCode] = useState(initialCourse);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarBusy, setAvatarBusy] = useState<"upload" | "remove" | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<{ display_name?: string; course_code?: string; form?: string }>({});
  const [status, setStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");

  // Recently used course codes (extracted from the user's materials + their saved profile).
  const [recentCourses, setRecentCourses] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const courseInputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (!user) return;
      // Pull the last 25 material titles + the saved profile course code.
      const [{ data: materials }, { data: profile }] = await Promise.all([
        supabase
          .from("materials")
          .select("title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase.from("profiles").select("course_code").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const seen = new Map<string, number>(); // code -> latest timestamp
      for (const m of materials ?? []) {
        const ts = new Date(m.created_at).getTime();
        for (const code of extractCourseCodes(m.title ?? "")) {
          const norm = normalizeCourseCode(code);
          if (!norm) continue;
          const prev = seen.get(norm);
          if (prev === undefined || ts > prev) seen.set(norm, ts);
        }
      }
      if (profile?.course_code) {
        const norm = normalizeCourseCode(profile.course_code);
        if (norm && !seen.has(norm)) seen.set(norm, 0);
      }
      const ranked = Array.from(seen.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([c]) => c)
        .slice(0, 8);
      setRecentCourses(ranked);
    })();
    return () => { cancelled = true; };
  }, []);

  // Close the suggestions dropdown when clicking elsewhere.
  useEffect(() => {
    const onDocPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (suggestionsRef.current?.contains(t)) return;
      if (courseInputRef.current?.contains(t)) return;
      setShowSuggestions(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, []);

  const filteredSuggestions = useMemo(() => {
    const q = normalizeCourseCode(courseCode);
    if (!recentCourses.length) return [];
    if (!q) return recentCourses;
    return recentCourses.filter((c) => c.includes(q) && c !== q).slice(0, 6);
  }, [courseCode, recentCourses]);

  // Track the most recently persisted values so we don't write redundant updates.
  const savedRef = useRef({ name: initialName, course: initialCourse });
  const debounceRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
  const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

  const onPickAvatar = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Please choose a PNG, JPG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be 5 MB or smaller.");
      return;
    }

    setAvatarBusy("upload");
    setAvatarError(null);

    const { data: { user } } = await getCurrentUser();
    if (!user) {
      setAvatarBusy(null);
      setAvatarError("You're not signed in.");
      return;
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });

    if (uploadError) {
      setAvatarBusy(null);
      setAvatarError(uploadError.message);
      return;
    }

    // Private bucket: store the storage path; signed URLs are generated on demand.
    const publicUrl = path;

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (dbError) {
      setAvatarBusy(null);
      setAvatarError(dbError.message);
      return;
    }

    setAvatarUrl(publicUrl);
    setAvatarBusy(null);
    toast({ title: "Profile photo updated" });
    await onSaved();
  };

  const removeAvatar = async () => {
    if (!avatarUrl) return;
    setAvatarBusy("remove");
    setAvatarError(null);
    const { data: { user } } = await getCurrentUser();
    if (!user) {
      setAvatarBusy(null);
      setAvatarError("You're not signed in.");
      return;
    }

    // Best-effort: remove the file too. Extract the storage path from the URL.
    try {
      const storagePath = toAvatarPath(avatarUrl);
      if (storagePath && storagePath.startsWith(`${user.id}/`)) {
        await supabase.storage.from("avatars").remove([storagePath]);
      }
    } catch { /* noop */ }

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      setAvatarBusy(null);
      setAvatarError(error.message);
      return;
    }
    setAvatarUrl(null);
    setAvatarBusy(null);
    toast({ title: "Profile photo removed" });
    await onSaved();
  };

  const validate = (name: string, course: string): { ok: boolean; errs: typeof errors } => {
    const result = profileSchema.safeParse({ display_name: name, course_code: course });
    if (result.success) return { ok: true, errs: {} };
    const next: typeof errors = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as "display_name" | "course_code";
      if (k && !next[k]) next[k] = issue.message;
    }
    return { ok: false, errs: next };
  };

  const persist = async (name: string, course: string) => {
    // Wait for any prior save so updates apply in the order the user typed.
    if (inFlightRef.current) {
      try { await inFlightRef.current; } catch { /* noop */ }
    }
    const run = (async () => {
      setStatus("saving");
      const { data: { user } } = await getCurrentUser();
      if (!user) {
        setStatus("error");
        setErrors((e) => ({ ...e, form: "You're not signed in" }));
        return;
      }
      const payload = {
        id: user.id,
        display_name: name.trim(),
        course_code: course.trim() ? course.trim() : null,
        updated_at: new Date().toISOString(),
      };
      const { data: saved, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select("display_name, course_code")
        .single();
      if (error) {
        setStatus("error");
        setErrors((e) => ({ ...e, form: error.message }));
        return;
      }
      const persistedName = saved?.display_name ?? name.trim();
      const persistedCourse = saved?.course_code ?? "";
      setDisplayName(persistedName);
      setCourseCode(persistedCourse);
      savedRef.current = { name: persistedName, course: persistedCourse };
      setErrors((e) => ({ ...e, form: undefined }));
      setStatus("saved");
      window.dispatchEvent(new CustomEvent("profile-updated"));
      await onSaved();
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => {
        setStatus((s) => (s === "saved" ? "idle" : s));
      }, 1800);
    })();
    inFlightRef.current = run;
    try { await run; } finally {
      if (inFlightRef.current === run) inFlightRef.current = null;
    }
  };

  const scheduleSave = (name: string, course: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const { ok, errs } = validate(name, course);
    setErrors((prev) => ({ ...errs, form: prev.form }));
    const unchanged = name === savedRef.current.name && course === savedRef.current.course;
    if (!ok || unchanged) {
      setStatus(unchanged ? "idle" : "pending");
      return;
    }
    setStatus("pending");
    debounceRef.current = window.setTimeout(() => {
      void persist(name, course);
    }, 800);
  };

  // Flush any pending change when leaving the screen so nothing is lost.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        const { ok } = validate(displayName, courseCode);
        const unchanged =
          displayName === savedRef.current.name && courseCode === savedRef.current.course;
        if (ok && !unchanged) void persist(displayName, courseCode);
      }
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDisplayName(v);
    scheduleSave(v, courseCode);
  };

  const onCourseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCourseCode(v);
    setShowSuggestions(true);
    scheduleSave(displayName, v);
  };

  const pickSuggestion = (code: string) => {
    setCourseCode(code);
    setShowSuggestions(false);
    scheduleSave(displayName, code);
    courseInputRef.current?.focus();
  };

  const StatusPill = () => {
    if (status === "saving") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </span>
      );
    }
    if (status === "pending") {
      return <span className="text-[11px] text-muted-foreground">Unsaved changes…</span>;
    }
    if (status === "saved") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-success">
          <CheckCircle2 className="h-3 w-3" /> Saved
        </span>
      );
    }
    if (status === "error") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" /> Couldn't save
        </span>
      );
    }
    return <span className="text-[11px] text-muted-foreground">All changes saved</span>;
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Edit Profile" onBack={onBack} />
      <div className="px-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleAvatarFile}
          className="hidden"
        />
        <div className="flex flex-col items-center py-4">
          <button
            type="button"
            onClick={onPickAvatar}
            disabled={!!avatarBusy}
            className="relative h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-bold shadow-glow overflow-hidden tap-scale disabled:opacity-70"
            aria-label={avatarUrl ? "Change profile photo" : "Upload profile photo"}
          >
            {avatarUrl ? (
              <AvatarImg value={avatarUrl} alt="Profile" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span>{(displayName || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
            )}
            <div className="absolute bottom-0 inset-x-0 h-7 bg-black/40 backdrop-blur-sm flex items-center justify-center text-[10px] font-semibold tracking-wide uppercase">
              {avatarBusy === "upload" ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading</span>
              ) : (
                <span className="inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> {avatarUrl ? "Change" : "Add photo"}</span>
              )}
            </div>
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={!!avatarBusy}
              className="mt-3 text-xs font-semibold text-destructive tap-scale disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {avatarBusy === "remove" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Remove photo
            </button>
          )}
          {avatarError && (
            <p className="mt-2 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {avatarError}
            </p>
          )}
          {!avatarError && !avatarUrl && (
            <p className="mt-2 text-[11px] text-muted-foreground">PNG, JPG, WEBP or GIF · up to 5 MB</p>
          )}
        </div>

        <div className="flex justify-end mb-2 h-4">
          <StatusPill />
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground">Display Name</label>
          <Input
            value={displayName}
            onChange={onNameChange}
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
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">Course / Department</label>
            {recentCourses.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{recentCourses.length} from your materials</span>
            )}
          </div>
          <div className="relative">
            <Input
              ref={courseInputRef}
              value={courseCode}
              onChange={onCourseChange}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowSuggestions(false);
                if (e.key === "Enter" && filteredSuggestions[0]) {
                  e.preventDefault();
                  pickSuggestion(filteredSuggestions[0]);
                }
              }}
              placeholder="e.g. CSC or Computer Science"
              maxLength={15}
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!errors.course_code}
              aria-autocomplete="list"
              aria-expanded={showSuggestions && filteredSuggestions.length > 0}
              className={`mt-1 ${errors.course_code ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-border bg-popover shadow-elevated overflow-hidden animate-fade-in"
              >
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent
                </p>
                <ul className="max-h-56 overflow-y-auto">
                  {filteredSuggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickSuggestion(s)}
                        className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm hover:bg-secondary tap-scale"
                      >
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 font-semibold">{s}</span>
                        <span className="text-[10px] text-muted-foreground">Tap to use</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {errors.course_code ? (
            <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.course_code}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Your course or department · max 15 characters
            </p>
          )}
        </div>

        <ExtraProfileFields />

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
          onClick={async () => {
            if (debounceRef.current) {
              window.clearTimeout(debounceRef.current);
              debounceRef.current = null;
            }
            const { ok, errs } = validate(displayName, courseCode);
            setErrors((prev) => ({ ...errs, form: prev.form }));
            if (!ok) return;
            await persist(displayName, courseCode);
          }}
          disabled={status === "saving" || !!errors.display_name || !!errors.course_code}
          className="w-full mt-6 h-12 rounded-2xl gradient-primary text-white font-semibold"
        >
          {status === "saving" ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
          ) : status === "saved" ? (
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Saved</span>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          className="w-full mt-2 h-12 rounded-2xl font-semibold"
        >
          Done
        </Button>
      </div>
    </div>
  );
};

const LEVEL_OPTIONS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgrad", "Other"];

const ExtraProfileFields = () => {
  const [level, setLevel] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [weeklyGoal, setWeeklyGoal] = useState<number>(5);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("level, exam_date, weekly_goal")
        .eq("id", user.id)
        .maybeSingle();
      setLevel(data?.level ?? "");
      setExamDate(data?.exam_date ?? "");
      setWeeklyGoal(data?.weekly_goal ?? 5);
      setLoaded(true);
    })();
  }, []);

  const save = async (patch: { level?: string | null; exam_date?: string | null; weekly_goal?: number }) => {
    const { data: { user } } = await getCurrentUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (!error) {
      setSavedAt(Date.now());
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast({ title: "Saved" });
    } else {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    }
  };

  if (!loaded) return null;

  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground">Level</label>
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); void save({ level: e.target.value || null }); }}
          className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Not set</option>
          {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground">Next Exam Date</label>
        <Input
          type="date"
          value={examDate}
          onChange={(e) => { setExamDate(e.target.value); void save({ exam_date: e.target.value || null }); }}
          className="mt-1"
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">Shows an exam countdown on your dashboard.</p>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground">Weekly Goal (sessions)</label>
        <Input
          type="number"
          min={1}
          max={50}
          value={weeklyGoal}
          onChange={(e) => {
            const n = Math.max(1, Math.min(50, Number(e.target.value) || 1));
            setWeeklyGoal(n);
            void save({ weekly_goal: n });
          }}
          className="mt-1"
        />
        {savedAt && <p className="mt-1.5 text-[11px] text-success">Saved</p>}
      </div>
    </>
  );
};

type NotifPrefs = {
  notify_study_reminders: boolean;
  notify_new_features: boolean;
  notify_practice_streaks: boolean;
  notify_weekly_summary: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  reminder_time: string | null;
  push_enabled: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  notify_study_reminders: true,
  notify_new_features: true,
  notify_practice_streaks: true,
  notify_weekly_summary: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  reminder_time: "19:00",
  push_enabled: false,
};

const NotificationsScreen = ({ onBack }: { onBack: () => void }) => {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("notify_study_reminders, notify_new_features, notify_practice_streaks, notify_weekly_summary, quiet_hours_start, quiet_hours_end, reminder_time, push_enabled")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPrefs({
          notify_study_reminders: data.notify_study_reminders ?? true,
          notify_new_features: data.notify_new_features ?? true,
          notify_practice_streaks: data.notify_practice_streaks ?? true,
          notify_weekly_summary: data.notify_weekly_summary ?? false,
          quiet_hours_start: data.quiet_hours_start ?? null,
          quiet_hours_end: data.quiet_hours_end ?? null,
          reminder_time: data.reminder_time ?? "19:00",
          push_enabled: data.push_enabled ?? false,
        });
        setQuietEnabled(!!(data.quiet_hours_start && data.quiet_hours_end));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async (patch: Partial<NotifPrefs>) => {
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    const { data: { user } } = await getCurrentUser();
    if (!user) { setSaving(false); return; }
    const { data: saved, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("notify_study_reminders, notify_new_features, notify_practice_streaks, notify_weekly_summary, quiet_hours_start, quiet_hours_end, reminder_time, push_enabled")
      .single();
    setSaving(false);
    if (error) {
      setPrefs(prev);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    if (saved) {
      setPrefs({
        notify_study_reminders: saved.notify_study_reminders ?? true,
        notify_new_features: saved.notify_new_features ?? true,
        notify_practice_streaks: saved.notify_practice_streaks ?? true,
        notify_weekly_summary: saved.notify_weekly_summary ?? false,
        quiet_hours_start: saved.quiet_hours_start ?? null,
        quiet_hours_end: saved.quiet_hours_end ?? null,
        reminder_time: saved.reminder_time ?? "19:00",
        push_enabled: saved.push_enabled ?? false,
      });
      setQuietEnabled(!!(saved.quiet_hours_start && saved.quiet_hours_end));
    }
    window.dispatchEvent(new CustomEvent("profile-updated"));
    // Reschedule local reminder if reminder time or study-reminder toggle changed.
    if (patch.reminder_time !== undefined || patch.notify_study_reminders !== undefined) {
      const { scheduleDailyReminder } = await import("@/lib/notifications");
      scheduleDailyReminder(next.reminder_time, next.notify_study_reminders);
    }
  };

  const requestPush = async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Not supported", description: "This device doesn't support notifications." });
      return;
    }
    const { enableBrowserPush } = await import("@/lib/notifications");
    const ok = await enableBrowserPush(null);
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    if (ok) {
      await save({ push_enabled: true });
      toast({ title: "Notifications enabled", description: "You'll get reminders, streak alerts, and study pack updates." });
    } else {
      toast({ title: "Permission denied", description: "Enable notifications in your browser settings." });
    }
  };

  const onTimeChange = (key: "quiet_hours_start" | "quiet_hours_end", value: string) => {
    save({ [key]: value || null } as Partial<NotifPrefs>);
  };

  const toggleQuiet = (v: boolean) => {
    setQuietEnabled(v);
    if (!v) save({ quiet_hours_start: null, quiet_hours_end: null });
    else if (!prefs.quiet_hours_start && !prefs.quiet_hours_end) {
      save({ quiet_hours_start: "22:00", quiet_hours_end: "07:00" });
    }
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Notifications" onBack={onBack} />
      <div className="px-5 space-y-6 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading preferences…</p>
        ) : (
          <>
            <Section title="Device">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Bell className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Push Notifications</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {permission === "granted" ? "Allowed on this device" :
                       permission === "denied" ? "Blocked — change in browser settings" :
                       permission === "unsupported" ? "Not supported on this device" :
                       "Tap allow to enable"}
                    </p>
                  </div>
                </div>
                {permission !== "granted" && permission !== "unsupported" && (
                  <Button size="sm" onClick={requestPush} className="rounded-xl">Allow</Button>
                )}
                {permission === "granted" && <span className="text-xs text-primary font-medium">On</span>}
              </div>
            </Section>

            <Section title="Notify me about">
              <ToggleRow icon={Flame} label="Study reminders" checked={prefs.notify_study_reminders} onChange={(v) => save({ notify_study_reminders: v })} />
              {prefs.notify_study_reminders && (
                <div className="flex items-center justify-between p-4 border-t border-border/40">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <span className="font-medium text-sm">Daily reminder time</span>
                  </div>
                  <Input
                    type="time"
                    value={prefs.reminder_time ?? "19:00"}
                    onChange={(e) => save({ reminder_time: e.target.value || "19:00" })}
                    className="w-32 h-9 rounded-lg"
                  />
                </div>
              )}
              <ToggleRow icon={Award} label="Practice streaks" checked={prefs.notify_practice_streaks} onChange={(v) => save({ notify_practice_streaks: v })} />
              <ToggleRow icon={Sparkles} label="New features" checked={prefs.notify_new_features} onChange={(v) => save({ notify_new_features: v })} />
              <ToggleRow icon={Brain} label="Weekly summary" checked={prefs.notify_weekly_summary} onChange={(v) => save({ notify_weekly_summary: v })} />
            </Section>

            <Section title="Quiet Hours">
              <ToggleRow icon={Bell} label="Pause notifications during set hours" checked={quietEnabled} onChange={toggleQuiet} />
              {quietEnabled && (
                <>
                  <div className="flex items-center justify-between p-4 border-t border-border/40">
                    <div className="flex items-center gap-3">
                      <Moon className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">From</span>
                    </div>
                    <Input
                      type="time"
                      value={prefs.quiet_hours_start ?? ""}
                      onChange={(e) => onTimeChange("quiet_hours_start", e.target.value)}
                      className="w-32 h-9 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border-t border-border/40">
                    <div className="flex items-center gap-3">
                      <Sun className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">To</span>
                    </div>
                    <Input
                      type="time"
                      value={prefs.quiet_hours_end ?? ""}
                      onChange={(e) => onTimeChange("quiet_hours_end", e.target.value)}
                      className="w-32 h-9 rounded-lg"
                    />
                  </div>
                </>
              )}
            </Section>

            {saving && <p className="text-xs text-muted-foreground text-center">Saving…</p>}
          </>
        )}
      </div>
    </div>
  );
};

const LogoutScreen = ({ onCancel }: { onCancel: () => void }) => {
  const [loading, setLoading] = useState(false);
  const signOut = async () => {
    setLoading(true);
    try {
      // Clear legacy + per-user profile caches so the next user can't see stale data.
      Object.keys(localStorage).forEach((k) => {
        if (k === "studymind-profile-cache" || k.startsWith("studymind-profile-cache:")) {
          localStorage.removeItem(k);
        }
      });
    } catch { /* noop */ }
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

// ---------- Email Preferences ----------

type EmailPrefs = {
  email_weekly_digest: boolean;
  email_product_updates: boolean;
  email_study_tips: boolean;
  email_security_alerts: boolean;
};

const DEFAULT_EMAIL_PREFS: EmailPrefs = {
  email_weekly_digest: true,
  email_product_updates: true,
  email_study_tips: false,
  email_security_alerts: true,
};

const EmailPreferencesScreen = ({ onBack }: { onBack: () => void }) => {
  const [prefs, setPrefs] = useState<EmailPrefs>(DEFAULT_EMAIL_PREFS);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("email_weekly_digest, email_product_updates, email_study_tips, email_security_alerts")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPrefs({
          email_weekly_digest: data.email_weekly_digest ?? true,
          email_product_updates: data.email_product_updates ?? true,
          email_study_tips: data.email_study_tips ?? false,
          email_security_alerts: data.email_security_alerts ?? true,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async (patch: Partial<EmailPrefs>) => {
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    const { data: { user } } = await getCurrentUser();
    if (!user) { setSaving(false); return; }
    const { data: saved, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("email_weekly_digest, email_product_updates, email_study_tips, email_security_alerts")
      .single();
    setSaving(false);
    if (error) {
      setPrefs(prev);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    if (saved) {
      setPrefs({
        email_weekly_digest: saved.email_weekly_digest ?? true,
        email_product_updates: saved.email_product_updates ?? true,
        email_study_tips: saved.email_study_tips ?? false,
        email_security_alerts: saved.email_security_alerts ?? true,
      });
    }
    window.dispatchEvent(new CustomEvent("profile-updated"));
  };

  const unsubscribeAll = async () => {
    await save({
      email_weekly_digest: false,
      email_product_updates: false,
      email_study_tips: false,
    });
    toast({ title: "Unsubscribed", description: "You'll still receive security alerts." });
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Email Preferences" onBack={onBack} />
      <div className="px-5 space-y-6 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
        ) : (
          <>
            <div className="rounded-2xl bg-primary-soft p-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Sending to</p>
                <p className="text-sm font-semibold truncate">{email || "—"}</p>
              </div>
            </div>

            <Section title="Updates">
              <ToggleRow icon={Sparkles} label="Weekly progress digest" checked={prefs.email_weekly_digest} onChange={(v) => save({ email_weekly_digest: v })} />
              <ToggleRow icon={Bell} label="Product updates & new features" checked={prefs.email_product_updates} onChange={(v) => save({ email_product_updates: v })} />
              <ToggleRow icon={Brain} label="Study tips & learning insights" checked={prefs.email_study_tips} onChange={(v) => save({ email_study_tips: v })} />
            </Section>

            <Section title="Required">
              <ToggleRow icon={Lock} label="Account & security alerts" checked={prefs.email_security_alerts} onChange={(v) => save({ email_security_alerts: v })} />
              <p className="px-4 py-2 text-[11px] text-muted-foreground">
                We strongly recommend keeping security alerts on so we can notify you of sign-ins and password changes.
              </p>
            </Section>

            <Button onClick={unsubscribeAll} variant="outline" className="w-full h-11 rounded-2xl">
              Unsubscribe from all marketing emails
            </Button>

            {saving && <p className="text-xs text-muted-foreground text-center">Saving…</p>}
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Language ----------

const LanguageScreen = ({ onBack }: { onBack: () => void }) => {
  const [selected, setSelected] = useState<string>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await getCurrentUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles").select("language").eq("id", user.id).maybeSingle();
      if (!cancelled) {
        setSelected(data?.language ?? "en");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const choose = async (code: string) => {
    if (code === selected) return;
    setSaving(code);
    const prev = selected;
    setSelected(code);
    const { data: { user } } = await getCurrentUser();
    if (!user) { setSaving(null); return; }
    const { data: saved, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, language: code, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("language")
      .single();
    setSaving(null);
    if (error) {
      setSelected(prev);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    if (saved?.language) setSelected(saved.language);
    window.dispatchEvent(new CustomEvent("profile-updated"));
    toast({ title: "Language updated", description: LANGUAGES.find((l) => l.code === code)?.label });
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Language" onBack={onBack} />
      <div className="px-5 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">Choose your preferred language for the app interface.</p>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              {LANGUAGES.map((l) => {
                const active = selected === l.code;
                const isSaving = saving === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => choose(l.code)}
                    disabled={!!saving}
                    className="w-full px-4 py-3 flex items-center gap-3 tap-scale text-left disabled:opacity-70"
                  >
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm font-medium">{l.label}</span>
                    <span className="text-[11px] text-muted-foreground uppercase">{l.code}</span>
                    {active && !isSaving && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {isSaving && <span className="text-[11px] text-muted-foreground">Saving…</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Download Management ----------

interface DownloadedItem {
  id: string;
  title: string;
  created_at: string;
  bytes: number;
  questionCount: number;
}

const DownloadManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [items, setItems] = useState<DownloadedItem[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadDownloads = () => {
    setLoading(true);
    const found: DownloadedItem[] = [];
    let total = 0;
    try {
      // Walk the cache and look for cached studypack/questions entries.
      const packs: Record<string, { bytes: number; pack: any }> = {};
      const questionBytes: Record<string, { bytes: number; count: number }> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("studymind-cache-")) continue;
        const v = localStorage.getItem(k) ?? "";
        const bytes = (k.length + v.length) * 2;
        total += bytes;

        const studyMatch = k.match(/:studypack:([^:]+)$/);
        if (studyMatch) {
          try {
            const parsed = JSON.parse(v);
            packs[studyMatch[1]] = { bytes, pack: parsed };
          } catch { /* noop */ }
          continue;
        }
        const qMatch = k.match(/:questions:([^:]+)$/);
        if (qMatch) {
          try {
            const parsed = JSON.parse(v);
            questionBytes[qMatch[1]] = {
              bytes,
              count: Array.isArray(parsed) ? parsed.length : 0,
            };
          } catch { /* noop */ }
        }
      }

      for (const [id, info] of Object.entries(packs)) {
        if (id === "latest") continue;
        const q = questionBytes[id];
        const title = info.pack?.material?.title ?? info.pack?.pack?.summary?.slice(0, 40) ?? "Study Pack";
        found.push({
          id,
          title,
          created_at: info.pack?.pack?.created_at ?? new Date().toISOString(),
          bytes: info.bytes + (q?.bytes ?? 0),
          questionCount: q?.count ?? 0,
        });
      }
    } catch { /* noop */ }
    found.sort((a, b) => b.bytes - a.bytes);
    setItems(found);
    setTotalBytes(total);
    setLoading(false);
  };

  useEffect(() => { loadDownloads(); }, []);

  const removeItem = async (id: string) => {
    setRemovingId(id);
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith("studymind-cache-") &&
          (k.endsWith(`:studypack:${id}`) || k.endsWith(`:questions:${id}`))
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
    loadDownloads();
    setRemovingId(null);
    toast({ title: "Removed from device" });
  };

  const removeAll = () => {
    items.forEach((i) => {
      try {
        for (let idx = localStorage.length - 1; idx >= 0; idx--) {
          const k = localStorage.key(idx);
          if (!k) continue;
          if (k.endsWith(`:studypack:${i.id}`) || k.endsWith(`:questions:${i.id}`)) {
            localStorage.removeItem(k);
          }
        }
      } catch { /* noop */ }
    });
    loadDownloads();
    toast({ title: "All downloads removed" });
  };

  return (
    <div className="animate-fade-in">
      <SubHeader title="Download Management" onBack={onBack} />
      <div className="px-5 pb-6 space-y-5">
        <div className="rounded-2xl gradient-primary p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-white/80">Stored on this device</p>
              <p className="text-2xl font-bold">{formatBytes(totalBytes)}</p>
            </div>
          </div>
          <p className="text-[11px] text-white/80 mt-3">
            Downloaded study packs let you review summaries and practice questions without an internet connection.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Scanning device…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center">
            <Download className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold">No downloads yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Open a study pack while online to make it available offline.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {items.length} item{items.length === 1 ? "" : "s"}
              </h3>
              <button onClick={removeAll} className="text-xs font-semibold text-destructive tap-scale">
                Remove all
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{it.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {it.questionCount} question{it.questionCount === 1 ? "" : "s"} · {formatBytes(it.bytes)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(it.id)}
                    disabled={removingId === it.id}
                    className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center tap-scale disabled:opacity-50"
                    aria-label="Remove download"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
