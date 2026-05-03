import { useNavigate } from "react-router-dom";
import { Dashboard } from "@/components/studymind/Dashboard";

const HomePage = () => {
  const navigate = useNavigate();
  return (
    <Dashboard
      onNavigate={(screen, payload) => {
        switch (screen) {
          case "upload":
            navigate("/upload");
            break;
          case "studypack":
            navigate(
              payload?.studyPackId ? `/studypack/${payload.studyPackId}` : "/studypack"
            );
            break;
          case "examfocus":
            navigate("/exam-focus");
            break;
          case "profile":
            navigate("/profile");
            break;
          case "practice":
            navigate(
              payload?.studyPackId
                ? `/practice/${payload.studyPackId}`
                : payload?.topic
                ? `/practice?topic=${encodeURIComponent(payload.topic)}`
                : "/practice"
            );
            break;
          case "analytics":
            navigate("/analytics");
            break;
          case "leaderboard":
            navigate("/leaderboard");
            break;
        }
      }}
      onOpenNotifications={() => navigate("/notifications")}
    />
  );
};

export default HomePage;
