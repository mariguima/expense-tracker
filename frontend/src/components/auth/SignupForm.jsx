import { useState } from "react";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";

export default function SignupForm({ values, onChange, onContinue }) {
  const [errors, setErrors] = useState({});

  const update = (event) => {
    const { name, value } = event.currentTarget;
    onChange(name, value);
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const continueSignup = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.firstName.trim()) nextErrors.firstName = "Enter your first name.";
    if (!values.lastName.trim()) nextErrors.lastName = "Enter your last name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (values.password.length < 15 || values.password.length > 128 || new TextEncoder().encode(values.password).length > 72) nextErrors.password = "Use at least 15 characters and no more than 72 UTF-8 bytes.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onContinue();
  };

  return (
    <form className="auth-form signup-form" onSubmit={continueSignup} noValidate>
      <div className="auth-name-row">
        <div className="form-field">
          <label className="label" htmlFor="signup-first-name">First name</label>
          <Input id="signup-first-name" name="firstName" value={values.firstName} onChange={update} autoComplete="given-name" placeholder="Maria" invalid={!!errors.firstName} describedBy={errors.firstName ? "signup-first-name-error" : undefined} />
          {errors.firstName && <span id="signup-first-name-error" className="auth-field-error" role="alert">{errors.firstName}</span>}
        </div>
        <div className="form-field">
          <label className="label" htmlFor="signup-last-name">Last name</label>
          <Input id="signup-last-name" name="lastName" value={values.lastName} onChange={update} autoComplete="family-name" placeholder="Silva" invalid={!!errors.lastName} describedBy={errors.lastName ? "signup-last-name-error" : undefined} />
          {errors.lastName && <span id="signup-last-name-error" className="auth-field-error" role="alert">{errors.lastName}</span>}
        </div>
      </div>
      <div className="form-field">
        <label className="label" htmlFor="signup-email">Email address</label>
        <Input id="signup-email" name="email" type="email" value={values.email} onChange={update} autoComplete="email" placeholder="you@example.com" invalid={!!errors.email} describedBy={errors.email ? "signup-email-error" : undefined} />
        {errors.email && <span id="signup-email-error" className="auth-field-error" role="alert">{errors.email}</span>}
      </div>
      <div className="form-field">
        <label className="label" htmlFor="signup-password">Create a password</label>
        <Input id="signup-password" name="password" type="password" value={values.password} onChange={update} autoComplete="new-password" placeholder="At least 15 characters" invalid={!!errors.password} describedBy={errors.password ? "signup-password-error" : undefined} />
        {errors.password && <span id="signup-password-error" className="auth-field-error" role="alert">{errors.password}</span>}
      </div>
      <Button className="auth-submit" type="submit">Continue</Button>
    </form>
  );
}
