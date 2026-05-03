import { useNavigate, useParams } from "react-router-dom";
import { Practice } from "@/components/studymind/Practice";

const PracticePage = () => {
  const navigate = useNavigate();
  const { packId } = useParams<{ packId?: string }>();
  return (
    <Practice
      studyPackId={packId ?? null}
      onBack={() => navigate(-1)}
      onFinish={() => navigate("/exam-focus", { replace: true })}
    />
  );
};

export default PracticePage;
