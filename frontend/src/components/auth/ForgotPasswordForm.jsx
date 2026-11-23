import { useState } from "react";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const onSubmit = (event) => {
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
    setNotice("Password reset emails are not available yet.");
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
          invalid={!!error}
          describedBy={error ? "reset-email-error" : undefined}
        />
        {error && <span className="auth-field-error" id="reset-email-error" role="alert">{error}</span>}
      </div>
      <Button className="auth-submit" type="submit">Send reset link<span aria-hidden="true">→</span></Button>
      {notice && <p className="auth-reset-notice" role="status">{notice}</p>}
    </form>
  );
}
