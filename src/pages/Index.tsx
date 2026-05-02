import { useState, useEffect, useRef, useCallback } from "react";
import { Splash } from "@/components/studymind/Splash";
import { Auth } from "@/components/studymind/Auth";
import { Onboarding } from "@/components/studymind/Onboarding";
import { Dashboard } from "@/components/studymind/Dashboard";
import { UploadScreen } from "@/components/studymind/UploadScreen";
import { StudyPack } from "@/components/studymind/StudyPack";
import { Practice } from "@/components/studymind/Practice";
import { ExamFocus } from "@/components/studymind/ExamFocus";
import { Profile } from "@/components/studymind/Profile";
import { Materials } from "@/components/studymind/Materials";
import { NotificationsCenter } from "@/components/studymind/NotificationsCenter";
import { Analytics } from "@/components/studymind/Analytics";
import { Leaderboard } from "@/components/studymind/Leaderboard";
import { BottomNav, type Screen } from "@/components/studymind/BottomNav";
import { InstallPrompt } from "@/components/studymind/InstallPrompt";
import { OfflineBanner } from "@/components/studymind/OfflineBanner";
import { useSession } from "@/hooks/useSession";
import { scheduleDailyReminder, computeStreak, checkStreakMilestone } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type View =
  | "splash"
  | "auth"
  | "home"
  | "upload"
  | "studypack"
  | "practice"
  | "examfocus"
  | "profile"
  | "materials"
  | "notifications"
  | "analytics"
  | "leaderboard";

const Index = () => {
  const { user, loading } = useSession();
  const [view, setView] = useState<View>("splash");
  const [tab, setTab] = useState<Screen>("home");
  const [activeStudyPack, setActiveStudyPack] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  // Check if the signed-in user has completed onboarding (level + course set).
  useEffect(() => {
    if (!user) { setNeedsOnboarding(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("level, course_code, display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const incomplete = !data?.level || !data?.course_code || !data?.display_name;
      setNeedsOnboarding(incomplete);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Internal navigation history stack so the device/browser back button
  // returns to the previous in-app view instead of closing the app.
  const historyRef = useRef<Array<{ view: View; tab: Screen }>>([
    { view: "splash", tab: "home" },
  ]);
  const isPoppingRef = useRef(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const pushHistory = useCallback((next: { view: View; tab: Screen }) => {
    const stack = historyRef.current;
    const top = stack[stack.length - 1];
    if (top && top.view === next.view && top.tab === next.tab) return;
    stack.push(next);
    window.history.pushState({ idx: stack.length - 1 }, "");
  }, []);

  // Seed a single history entry on mount so the first back press is captured.
  useEffect(() => {
    window.history.replaceState({ idx: 0 }, "");
  }, []);

  // Handle hardware/browser back button: pop our internal stack instead of leaving.
  useEffect(() => {
    const onPop = () => {
      const stack = historyRef.current;
      if (stack.length > 1) {
        stack.pop();
        const prev = stack[stack.length - 1];
        isPoppingRef.current = true;
        setView(prev.view);
        setTab(prev.tab);
        isPoppingRef.current = false;
      } else {
        // No internal history left — re-seed so back is still captured, then ask to exit.
        window.history.pushState({ idx: 0 }, "");
        setShowExitConfirm(true);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback(
    (nextView: View, nextTab?: Screen) => {
      const resolvedTab = nextTab ?? tab;
      setView(nextView);
      if (nextTab) setTab(nextTab);
      if (!isPoppingRef.current) {
        pushHistory({ view: nextView, tab: resolvedTab });
      }
    },
    [tab, pushHistory]
  );

  // Bootstrap notifications: schedule daily reminder + check streak milestone on login.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("reminder_time, notify_study_reminders")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      scheduleDailyReminder(
        data?.reminder_time ?? "19:00",
        data?.notify_study_reminders ?? true,
      );
      const streak = await computeStreak();
      if (streak.current > 0) await checkStreakMilestone(streak.current);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <main className="screen-shell flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (view === "splash" && !user) {
    return (
      <main className="screen-shell !pb-0">
        <Splash onStart={() => navigate("auth")} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="screen-shell !pb-0">
        <Auth onAuthed={() => navigate("home", "home")} />
      </main>
    );
  }

  if (needsOnboarding === null) {
    return (
      <main className="screen-shell flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (needsOnboarding) {
    return (
      <main className="screen-shell !pb-0">
        <Onboarding onComplete={() => { setNeedsOnboarding(false); navigate("home", "home"); }} />
      </main>
    );
  }

  const handleTab = (s: Screen) => {
    let nextView: View = view;
    if (s === "home") nextView = "home";
    if (s === "practice") nextView = "studypack";
    if (s === "materials") nextView = "materials";
    if (s === "profile") nextView = "profile";
    navigate(nextView, s);
  };

  return (
    <main className="screen-shell">
      <OfflineBanner />
      <div key={view} className="page-transition">
        {(view === "splash" || view === "home" || view === "auth") && (
          <Dashboard
            onNavigate={(s, payload) => {
              if (s === "studypack") {
                setActiveStudyPack(payload?.studyPackId ?? null);
              }
              if (s === "practice") {
                setActiveStudyPack(payload?.studyPackId ?? activeStudyPack);
              }
              if (s === "profile") {
                navigate("profile", "profile");
                return;
              }
              navigate(s as View);
            }}
            onOpenNotifications={() => navigate("notifications")}
          />
        )}
        {view === "upload" && (
          <UploadScreen
            onBack={() => window.history.back()}
            onComplete={(packId) => { setActiveStudyPack(packId); navigate("studypack", "practice"); }}
          />
        )}
        {view === "studypack" && (
          <StudyPack
            studyPackId={activeStudyPack}
            onBack={() => window.history.back()}
            onPractice={(packId) => { setActiveStudyPack(packId); navigate("practice"); }}
          />
        )}
        {view === "practice" && (
          <Practice
            studyPackId={activeStudyPack}
            onBack={() => window.history.back()}
            onFinish={() => navigate("examfocus")}
          />
        )}
        {view === "examfocus" && (
          <ExamFocus
            onBack={() => window.history.back()}
            onPractice={() => activeStudyPack && navigate("practice")}
          />
        )}
        {view === "profile" && <Profile />}
        {view === "materials" && (
          <Materials
            onUpload={() => navigate("upload")}
            onOpenPack={(packId) => { setActiveStudyPack(packId); navigate("studypack", "practice"); }}
          />
        )}
        {view === "analytics" && <Analytics onBack={() => window.history.back()} />}
        {view === "leaderboard" && <Leaderboard onBack={() => window.history.back()} />}
        {view === "notifications" && (
          <NotificationsCenter
            onBack={() => window.history.back()}
            onOpenItem={(type, data) => {
              if (type === "study_pack_ready" && typeof data?.study_pack_id === "string") {
                setActiveStudyPack(data.study_pack_id as string);
                navigate("studypack", "practice");
              }
            }}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={handleTab} />
      <InstallPrompt />

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit app?</AlertDialogTitle>
            <AlertDialogDescription>
              You're at the main screen. Do you want to leave the app?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitConfirm(false);
                // Go back twice: once to undo our re-seed, once to actually leave.
                window.history.go(-2);
              }}
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default Index;
