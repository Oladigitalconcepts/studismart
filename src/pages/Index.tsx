import { useState } from "react";
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
        <Splash onStart={() => setView("auth")} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="screen-shell !pb-0">
        <Auth onAuthed={() => setView("home")} />
      </main>
    );
  }

  const handleTab = (s: Screen) => {
    setTab(s);
    if (s === "home") setView("home");
    if (s === "practice") setView("studypack");
    if (s === "materials") setView("materials");
    if (s === "profile") setView("profile");
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
