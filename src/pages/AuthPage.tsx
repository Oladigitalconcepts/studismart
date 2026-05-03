import { useNavigate } from "react-router-dom";
import { Auth } from "@/components/studymind/Auth";

const AuthPage = () => {
  const navigate = useNavigate();
  return <Auth onAuthed={() => navigate("/home", { replace: true })} />;
};

export default AuthPage;
