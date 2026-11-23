import { useState } from "react";
import { login } from "../../api/authApi.js";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const data = await login({ email, password });
      onLoginSuccess?.(data);
    } catch (err) {
      const responseError = err.response?.data?.error || err.response?.data?.errors;
      setError(responseError ? JSON.stringify(responseError) : err.message || "Unable to sign in.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="form-field">
        <label className="label" htmlFor="email">Email address</label>
        <Input id="email" name="email" type="email" value={email} required disabled={processing} autoComplete="email" placeholder="you@example.com" onChange={(event) => setEmail(event.currentTarget.value)} />
      </div>
      <div className="form-field">
        <label className="label" htmlFor="password">Password</label>
        <Input id="password" name="password" type="password" value={password} required disabled={processing} autoComplete="current-password" placeholder="Enter your password" onChange={(event) => setPassword(event.currentTarget.value)} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button className="auth-submit" type="submit" disabled={processing}>{processing ? "Signing you in…" : "Sign in"}<span aria-hidden="true">→</span></Button>
    </form>
  );
}
