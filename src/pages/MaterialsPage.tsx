import { useNavigate } from "react-router-dom";
import { Materials } from "@/components/studymind/Materials";

const MaterialsPage = () => {
  const navigate = useNavigate();
  return (
    <Materials
      onUpload={() => navigate("/upload")}
      onOpenPack={(packId) => navigate(`/studypack/${packId}`)}
    />
  );
};

export default MaterialsPage;
