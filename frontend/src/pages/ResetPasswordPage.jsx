import { useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import ResetPasswordForm from "../components/auth/ResetPasswordForm.jsx";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  return (
    <AuthLayout
      className="auth-page--reset"
      title={<>Reset your<br />password</>}
      description="Enter the email you signed up with and create a new password."
    >
      <ResetPasswordForm token={params.get("token")} />
    </AuthLayout>
  );
}
