import { useState } from "react";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import { requestPasswordReset } from "../../api/authApi.js";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    const emailField = event.currentTarget.elements.namedItem("email");

    if (!email.trim()) {
      setError("Please enter your email address.");
      emailField?.focus();
      return;
    }

    if (!emailField?.checkValidity()) {
      setError("Enter a valid email address.");
      emailField?.focus();
      return;
    }

    setError("");
    setNotice("");
    setProcessing(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setNotice(result.message);
    } catch (err) {
      setError(err.response?.data?.error || "Could not send a reset link. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="form-field">
        <label className="label" htmlFor="reset-email">Email address</label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => { setEmail(event.currentTarget.value); setError(""); setNotice(""); }}
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={processing}
          invalid={!!error}
          describedBy={error ? "reset-email-error" : undefined}
        />
        {error && <span className="auth-field-error" id="reset-email-error" role="alert">{error}</span>}
      </div>
      <Button className="auth-submit" type="submit" disabled={processing}>{processing ? "Sending…" : "Send reset link"}<span aria-hidden="true">→</span></Button>
      {notice && <p className="auth-reset-notice" role="status">{notice} Check your inbox and spam folder. The link expires in 30 minutes.</p>}
    </form>
  );
}
