import { useNavigate } from "react-router-dom";
import { UploadScreen } from "@/components/studymind/UploadScreen";

const UploadPage = () => {
  const navigate = useNavigate();
  return (
    <UploadScreen
      onBack={() => navigate(-1)}
      onComplete={(packId) => navigate(`/studypack/${packId}`, { replace: true })}
    />
  );
};

export default UploadPage;
