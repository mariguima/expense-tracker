import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import LoginForm from "../components/auth/LoginForm.jsx";
import { saveAccountProfile } from "../data/profileSettings.js";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title={<>Good to see<br />you again.</>}
      description="Sign in to pick up where you left off and keep your spending in view."
    >
      <LoginForm onLoginSuccess={(data) => { saveAccountProfile(data.user); navigate("/dashboard"); }} />
      <p className="auth-switch auth-forgot"><Link to="/forgot-password">Forgot your password?</Link></p>
      <p className="auth-switch">New to Expense Tracker? <Link to="/signup">Create an account</Link></p>
    </AuthLayout>
  );
}
