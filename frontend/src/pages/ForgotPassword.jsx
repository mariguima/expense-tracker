import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm.jsx";

export default function ForgotPassword() {
  return (
    <AuthLayout
      beforeTitle={<Link className="auth-back-link" to="/login"> Back to log in</Link>}
      title={<>Forgot your<br />password?</>}
      description="Enter the email you signed up with and we'll send you a link to set a new one."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
