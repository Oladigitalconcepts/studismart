import { useNavigate } from "react-router-dom";
import { Analytics } from "@/components/studymind/Analytics";

const AnalyticsPage = () => {
  const navigate = useNavigate();
  return <Analytics onBack={() => navigate(-1)} />;
};

export default AnalyticsPage;
