import { useNavigate } from "react-router-dom";
import { ExamFocus } from "@/components/studymind/ExamFocus";

const ExamFocusPage = () => {
  const navigate = useNavigate();
  return (
    <ExamFocus
      onBack={() => navigate(-1)}
      onPractice={() => navigate("/practice")}
    />
  );
};

export default ExamFocusPage;
