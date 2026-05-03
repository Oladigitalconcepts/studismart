import { useNavigate } from "react-router-dom";
import { Splash } from "@/components/studymind/Splash";

const SplashPage = () => {
  const navigate = useNavigate();
  return <Splash onStart={() => navigate("/auth")} />;
};

export default SplashPage;
