import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/studymind/AppLayout";
import SplashPage from "./pages/SplashPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import StudyPackPage from "./pages/StudyPackPage";
import PracticePage from "./pages/PracticePage";
import ExamFocusPage from "./pages/ExamFocusPage";
import ProfilePage from "./pages/ProfilePage";
import MaterialsPage from "./pages/MaterialsPage";
import NotificationsPage from "./pages/NotificationsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import CreateTestPage from "./pages/CreateTestPage";
import QuizForOthersPage from "./pages/QuizForOthersPage";
import PublicQuizPage from "./pages/PublicQuizPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<SplashPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/studypack" element={<StudyPackPage />} />
            <Route path="/studypack/:packId" element={<StudyPackPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/practice/:packId" element={<PracticePage />} />
            <Route path="/exam-focus" element={<ExamFocusPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/create-test" element={<CreateTestPage />} />
            <Route path="/quiz-for-others" element={<QuizForOthersPage />} />
            <Route path="/q/:token" element={<PublicQuizPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
