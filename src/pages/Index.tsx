import { useState } from "react";
import { Splash } from "@/components/studymind/Splash";
import { Dashboard } from "@/components/studymind/Dashboard";
import { UploadScreen } from "@/components/studymind/UploadScreen";
import { StudyPack } from "@/components/studymind/StudyPack";
import { Practice } from "@/components/studymind/Practice";
import { ExamFocus } from "@/components/studymind/ExamFocus";
import { Profile } from "@/components/studymind/Profile";
import { Materials } from "@/components/studymind/Materials";
import { BottomNav, type Screen } from "@/components/studymind/BottomNav";

type View = "splash" | "home" | "upload" | "studypack" | "practice" | "examfocus" | "profile" | "materials" | "practice-tab";

const Index = () => {
  const [view, setView] = useState<View>("splash");
  const [tab, setTab] = useState<Screen>("home");

  const handleTab = (s: Screen) => {
    setTab(s);
    if (s === "home") setView("home");
    if (s === "practice") setView("studypack");
    if (s === "materials") setView("materials");
    if (s === "profile") setView("profile");
  };

  if (view === "splash") {
    return (
      <main className="screen-shell !pb-0">
        <Splash onStart={() => setView("home")} />
      </main>
    );
  }

  return (
    <main className="screen-shell">
      {view === "home" && <Dashboard onNavigate={(s) => setView(s)} />}
      {view === "upload" && (
        <UploadScreen onBack={() => setView("home")} onComplete={() => setView("studypack")} />
      )}
      {view === "studypack" && (
        <StudyPack onBack={() => { setView("home"); setTab("home"); }} onPractice={() => setView("practice")} />
      )}
      {view === "practice" && (
        <Practice onBack={() => setView("studypack")} onFinish={() => setView("examfocus")} />
      )}
      {view === "examfocus" && (
        <ExamFocus onBack={() => { setView("home"); setTab("home"); }} onPractice={() => setView("practice")} />
      )}
      {view === "profile" && <Profile />}
      {view === "materials" && <Materials onUpload={() => setView("upload")} />}

      <BottomNav active={tab} onChange={handleTab} />
    </main>
  );
};

export default Index;
