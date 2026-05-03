import { useNavigate, useSearchParams } from "react-router-dom";
import { Auth } from "@/components/studymind/Auth";

const AuthPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect");

  return (
    <Auth
      onAuthed={(opts) => {
        if (redirect) {
          navigate(redirect, { replace: true });
          return;
        }
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
