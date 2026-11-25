import { useState } from "react";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";

const currencies = [
  { value: "GBP", label: "British pound (£)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "US dollar ($)" },
];

export default function SignupMoneyForm({ values, onChange, onFinish, processing, error }) {
  const [errors, setErrors] = useState({});
  const symbol = values.currency === "EUR" ? "€" : values.currency === "USD" ? "$" : "£";

  const update = (event) => {
    const { name, value } = event.currentTarget;
    onChange(name, value);
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.currency) nextErrors.currency = "Choose a currency.";
    if (!values.monthlyBudget.trim() || !Number.isFinite(Number(values.monthlyBudget)) || Number(values.monthlyBudget) <= 0) nextErrors.monthlyBudget = "Enter a budget greater than zero.";
    if (!values.monthlySavingsGoal.trim() || !Number.isFinite(Number(values.monthlySavingsGoal)) || Number(values.monthlySavingsGoal) < 0) nextErrors.monthlySavingsGoal = "Enter a valid savings goal.";
    if (!values.emergencyFundTarget.trim() || !Number.isFinite(Number(values.emergencyFundTarget)) || Number(values.emergencyFundTarget) <= 0) nextErrors.emergencyFundTarget = "Enter a target greater than zero.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onFinish(values);
  };

  return (
    <form className="auth-form signup-money-form" onSubmit={submit} noValidate>
      <div className="form-field">
        <label className="label" htmlFor="signup-currency">Currency</label>
        <Select id="signup-currency" name="currency" value={values.currency} options={currencies} onChange={update} disabled={processing} invalid={!!errors.currency} />
        {errors.currency && <span className="auth-field-error" role="alert">{errors.currency}</span>}
      </div>
      <div className="form-field">
        <label className="label" htmlFor="signup-budget">Monthly budget</label>
        <div className="signup-money-input"><span aria-hidden="true">{symbol}</span><Input id="signup-budget" name="monthlyBudget" type="number" min="0.01" step="0.01" value={values.monthlyBudget} onChange={update} disabled={processing} invalid={!!errors.monthlyBudget} /></div>
        {errors.monthlyBudget && <span className="auth-field-error" role="alert">{errors.monthlyBudget}</span>}
      </div>
      <div className="auth-name-row">
        <div className="form-field">
          <label className="label" htmlFor="signup-savings-goal">Monthly savings goal</label>
          <div className="signup-money-input"><span aria-hidden="true">{symbol}</span><Input id="signup-savings-goal" name="monthlySavingsGoal" type="number" min="0" step="0.01" value={values.monthlySavingsGoal} onChange={update} disabled={processing} invalid={!!errors.monthlySavingsGoal} /></div>
          {errors.monthlySavingsGoal && <span className="auth-field-error" role="alert">{errors.monthlySavingsGoal}</span>}
        </div>
        <div className="form-field">
          <label className="label" htmlFor="signup-fund-target">Emergency fund target</label>
          <div className="signup-money-input"><span aria-hidden="true">{symbol}</span><Input id="signup-fund-target" name="emergencyFundTarget" type="number" min="0.01" step="0.01" value={values.emergencyFundTarget} onChange={update} disabled={processing} invalid={!!errors.emergencyFundTarget} /></div>
          {errors.emergencyFundTarget && <span className="auth-field-error" role="alert">{errors.emergencyFundTarget}</span>}
        </div>
      </div>
      {error && <p className="auth-field-error" role="alert">{error}</p>}
      <Button className="auth-submit" type="submit" disabled={processing}>{processing ? "Finishing setup…" : "Finish setup"}</Button>
      <p className="auth-switch">You can update this later in settings</p>
    </form>
  );
}
