import { useNavigate, useParams } from "react-router-dom";
import { StudyPack } from "@/components/studymind/StudyPack";

const StudyPackPage = () => {
  const navigate = useNavigate();
  const { packId } = useParams<{ packId?: string }>();
  return (
    <StudyPack
      studyPackId={packId ?? null}
      onBack={() => navigate(-1)}
      onPractice={(id) => navigate(`/practice/${id}`)}
    />
  );
};

export default StudyPackPage;
