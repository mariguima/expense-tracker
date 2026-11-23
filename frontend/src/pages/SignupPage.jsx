import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import SignupForm from "../components/auth/SignupForm.jsx";
import { saveAccountProfile } from "../data/profileSettings.js";

export default function SignupPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title={<>Make room for<br />better money habits.</>}
      description="Create your free account. A clearer picture of your spending starts here."
    >
      <SignupForm onSignupSuccess={(data) => { saveAccountProfile(data.user); navigate("/login?created=1"); }} />
      <p className="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
    </AuthLayout>
  );
}
