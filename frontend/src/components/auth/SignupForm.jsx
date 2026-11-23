import { useState } from "react";
import { signup } from "../../api/authApi.js";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";

export default function SignupForm({ onSignupSuccess }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const data = await signup({ name: `${firstName.trim()} ${lastName.trim()}`, email, password });
      onSignupSuccess?.(data);
    } catch (err) {
      const responseError = err.response?.data?.error || err.response?.data?.errors;
      setError(responseError ? JSON.stringify(responseError) : err.message || "Unable to create your account.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="auth-form signup-form" onSubmit={onSubmit}>
      <div className="auth-name-row">
        <div className="form-field">
          <label className="label" htmlFor="firstName">First name</label>
          <Input id="firstName" name="firstName" value={firstName} required disabled={processing} autoComplete="given-name" placeholder="Maria" onChange={(event) => setFirstName(event.currentTarget.value)} />
        </div>
        <div className="form-field">
          <label className="label" htmlFor="lastName">Last name</label>
          <Input id="lastName" name="lastName" value={lastName} required disabled={processing} autoComplete="family-name" placeholder="Silva" onChange={(event) => setLastName(event.currentTarget.value)} />
        </div>
      </div>
      <div className="form-field">
        <label className="label" htmlFor="email">Email address</label>
        <Input id="email" name="email" type="email" value={email} required disabled={processing} autoComplete="email" placeholder="you@example.com" onChange={(event) => setEmail(event.currentTarget.value)} />
      </div>
      <div className="form-field">
        <label className="label" htmlFor="password">Create a password</label>
        <Input id="password" name="password" type="password" value={password} required disabled={processing} autoComplete="new-password" placeholder="At least 8 characters" onChange={(event) => setPassword(event.currentTarget.value)} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button className="auth-submit" type="submit" disabled={processing}>{processing ? "Creating your account…" : "Create account"}<span aria-hidden="true">→</span></Button>
    </form>
  );
}
