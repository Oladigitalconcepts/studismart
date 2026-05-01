import { useState, useEffect, useRef, useCallback } from "react";
import { Splash } from "@/components/studymind/Splash";
import { Auth } from "@/components/studymind/Auth";
import { Dashboard } from "@/components/studymind/Dashboard";
import { UploadScreen } from "@/components/studymind/UploadScreen";
import { StudyPack } from "@/components/studymind/StudyPack";
import { Practice } from "@/components/studymind/Practice";
import { ExamFocus } from "@/components/studymind/ExamFocus";
import { Profile } from "@/components/studymind/Profile";
import { Materials } from "@/components/studymind/Materials";
import { BottomNav, type Screen } from "@/components/studymind/BottomNav";
import { InstallPrompt } from "@/components/studymind/InstallPrompt";
import { OfflineBanner } from "@/components/studymind/OfflineBanner";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";

type View =
  | "splash"
  | "auth"
  | "home"
  | "upload"
  | "studypack"
  | "practice"
  | "examfocus"
  | "profile"
  | "materials";

const Index = () => {
  const { user, loading } = useSession();
  const [view, setView] = useState<View>("splash");
  const [tab, setTab] = useState<Screen>("home");
  const [activeStudyPack, setActiveStudyPack] = useState<string | null>(null);

  // Internal navigation history stack so the device/browser back button
  // returns to the previous in-app view instead of closing the app.
  const historyRef = useRef<Array<{ view: View; tab: Screen }>>([
    { view: "splash", tab: "home" },
  ]);
  const isPoppingRef = useRef(false);

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
        // Nothing to go back to — re-seed so the next back press is also caught.
        window.history.pushState({ idx: 0 }, "");
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
            onNavigate={(s) => {
              if (s === "studypack") setActiveStudyPack(null);
              setView(s);
            }}
          />
        )}
        {view === "upload" && (
          <UploadScreen
            onBack={() => setView("home")}
            onComplete={(packId) => { setActiveStudyPack(packId); setView("studypack"); setTab("practice"); }}
          />
        )}
        {view === "studypack" && (
          <StudyPack
            studyPackId={activeStudyPack}
            onBack={() => { setView("home"); setTab("home"); }}
            onPractice={(packId) => { setActiveStudyPack(packId); setView("practice"); }}
          />
        )}
        {view === "practice" && (
          <Practice
            studyPackId={activeStudyPack}
            onBack={() => setView("studypack")}
            onFinish={() => setView("examfocus")}
          />
        )}
        {view === "examfocus" && (
          <ExamFocus
            onBack={() => { setView("home"); setTab("home"); }}
            onPractice={() => activeStudyPack && setView("practice")}
          />
        )}
        {view === "profile" && <Profile />}
        {view === "materials" && (
          <Materials
            onUpload={() => setView("upload")}
            onOpenPack={(packId) => { setActiveStudyPack(packId); setView("studypack"); setTab("practice"); }}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={handleTab} />
      <InstallPrompt />
    </main>
  );
};

export default Index;
