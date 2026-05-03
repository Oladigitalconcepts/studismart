import { useNavigate } from "react-router-dom";
import { NotificationsCenter } from "@/components/studymind/NotificationsCenter";

const NotificationsPage = () => {
  const navigate = useNavigate();
  return (
    <NotificationsCenter
      onBack={() => navigate(-1)}
      onOpenItem={(type, data) => {
        if (type === "study_pack_ready" && typeof data?.study_pack_id === "string") {
          navigate(`/studypack/${data.study_pack_id}`);
        }
      }}
    />
  );
};

export default NotificationsPage;
