import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import SignupForm from "../components/auth/SignupForm.jsx";
import SignupMoneyForm from "../components/auth/SignupMoneyForm.jsx";
import { signup } from "../api/authApi.js";
import { defaultProfile } from "../data/profileSettings.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [settings, setSettings] = useState({
    currency: defaultProfile.currency,
    monthlyBudget: defaultProfile.monthlyBudget,
    monthlySavingsGoal: defaultProfile.monthlySavingsGoal,
    emergencyFundTarget: defaultProfile.emergencyFundTarget,
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const completeSignup = async (selectedSettings) => {
    if (processing) return;
    setProcessing(true);
    setError("");
    try {
      await signup({
        first_name: account.firstName.trim(),
        last_name: account.lastName.trim(),
        email: account.email.trim(),
        password: account.password,
        financial_settings: {
          currency: selectedSettings.currency,
          monthly_budget: selectedSettings.monthlyBudget,
          monthly_savings_goal: selectedSettings.monthlySavingsGoal,
          emergency_fund_target: selectedSettings.emergencyFundTarget,
        },
      });
      navigate("/login?created=1");
    } catch (err) {
      const responseError = err.response?.data?.error || err.response?.data?.errors;
      const fieldErrors = responseError && typeof responseError === "object"
        ? Object.entries(responseError).flatMap(([field, messages]) => {
          const values = Array.isArray(messages) ? messages : Object.values(messages).flat();
          return values.map((message) => `${field.replaceAll("_", " ")}: ${message}`);
        })
        : [];
      const outdatedApi = fieldErrors.some((message) => message.includes("Unknown field"));
      setError(outdatedApi
        ? "The signup server is running older code. Restart the Flask backend, then try again."
        : typeof responseError === "string" ? responseError
          : fieldErrors.length ? fieldErrors.join(" ")
            : err.message || "Unable to create your account.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthLayout
      beforeTitle={
        <div className="signup-step-top">
          <div className="signup-progress-row">
            <div className="signup-progress" role="progressbar" aria-label="Signup progress" aria-valuemin="1" aria-valuemax="2" aria-valuenow={step}><i className="is-complete" /><i className={step === 2 ? "is-complete" : ""} /></div>
            <span>STEP {step} OF 2 </span>
          </div>
        </div>
      }
      title={step === 1 ? <>Make room for<br />better money habits</> : <>Now, set up<br />your money</>}
      description={step === 1 ? "Create your free account. A clearer picture of your spending starts here." : "Four quick answers for your dashboard. You can change them whenever you like."}
    >
      {step === 1 ? (
        <>
          <SignupForm values={account} onChange={(name, value) => setAccount((current) => ({ ...current, [name]: value }))} onContinue={() => setStep(2)} />
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </>
      ) : (
        <SignupMoneyForm values={settings} onChange={(name, value) => setSettings((current) => ({ ...current, [name]: value }))} onFinish={completeSignup} onSkip={() => completeSignup({ currency: defaultProfile.currency, monthlyBudget: defaultProfile.monthlyBudget, monthlySavingsGoal: defaultProfile.monthlySavingsGoal, emergencyFundTarget: defaultProfile.emergencyFundTarget })} processing={processing} error={error} />
      )}
    </AuthLayout>
  );
}
