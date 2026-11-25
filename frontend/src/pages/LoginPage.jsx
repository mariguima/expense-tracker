import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import LoginForm from "../components/auth/LoginForm.jsx";
import { saveAccountProfile } from "../data/profileSettings.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AuthLayout
      title={<>Good to see<br />you again</>}
      description="Sign in to pick up where you left off and keep your spending in view."
    >
      {location.state?.passwordReset && <p className="auth-success" role="status">Password updated. Sign in with your new password.</p>}
      <LoginForm onLoginSuccess={(data) => { saveAccountProfile(data.user, data.financial_settings); navigate("/dashboard"); }} />
      <p className="auth-switch auth-forgot"><Link to="/forgot-password">Forgot your password?</Link></p>
      <p className="auth-switch">New to Expense Tracker? <Link to="/signup">Create an account</Link></p>
    </AuthLayout>
  );
}
