import { useNavigate } from "react-router-dom";
import { Onboarding } from "@/components/studymind/Onboarding";

const OnboardingPage = () => {
  const navigate = useNavigate();
  return <Onboarding onComplete={() => navigate("/home", { replace: true })} />;
};

export default OnboardingPage;
