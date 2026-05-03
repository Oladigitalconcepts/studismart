import { useNavigate } from "react-router-dom";
import { Leaderboard } from "@/components/studymind/Leaderboard";

const LeaderboardPage = () => {
  const navigate = useNavigate();
  return <Leaderboard onBack={() => navigate(-1)} />;
};

export default LeaderboardPage;
