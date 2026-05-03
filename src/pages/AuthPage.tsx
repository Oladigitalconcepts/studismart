import { useNavigate } from "react-router-dom";
import { Auth } from "@/components/studymind/Auth";

const AuthPage = () => {
  const navigate = useNavigate();
  return (
    <Auth
      onAuthed={(opts) => {
        if (opts?.isNewUser) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      }}
    />
  );
};

export default AuthPage;
