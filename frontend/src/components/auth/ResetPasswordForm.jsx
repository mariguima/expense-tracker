import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "../../api/authApi.js";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";

export default function ResetPasswordForm({ token }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 15 || password.length > 128 || new TextEncoder().encode(password).length > 72) {
      setError("Use at least 15 characters and no more than 72 UTF-8 bytes.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setProcessing(true);
    try {
      await confirmPasswordReset(token, email.trim(), password);
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Could not reset your password. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return <p className="auth-reset-notice">This reset link is incomplete or invalid. <Link to="/forgot-password">Request a new link</Link>.</p>;

  return (
    <form className="auth-form auth-reset-form" onSubmit={onSubmit} noValidate>
      <div className="form-field">
        <label className="label" htmlFor="reset-account-email">Email address</label>
        <Input id="reset-account-email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.currentTarget.value); setError(""); }} autoComplete="email" placeholder="you@example.com" disabled={processing} invalid={!!error} />
      </div>
      <div className="form-field">
        <label className="label" htmlFor="new-password">Create a password</label>
        <Input id="new-password" type="password" value={password} onChange={(event) => { setPassword(event.currentTarget.value); setError(""); }} autoComplete="new-password" placeholder="At least 15 characters" disabled={processing} invalid={!!error} />
      </div>
      <div className="form-field">
        <label className="label" htmlFor="confirm-password">Confirm new password</label>
        <Input id="confirm-password" type="password" value={confirm} onChange={(event) => { setConfirm(event.currentTarget.value); setError(""); }} autoComplete="new-password" placeholder="Enter it again" disabled={processing} invalid={!!error} />
      </div>
      {error && <p className="auth-field-error" role="alert">{error} <Link to="/forgot-password">Request a new link</Link>.</p>}
      <Button className="auth-submit" type="submit" disabled={processing}>{processing ? "Updating…" : "Reset password"}</Button>
    </form>
  );
}
