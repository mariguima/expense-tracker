import { useState } from "react";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import DatePicker from "../ui/DatePicker.jsx";
import Icon from "../Icon.jsx";
import { currencySymbol, loadProfile } from "../../data/profileSettings.js";

const paymentOptions = [
  { value: "debit", label: "Debit card" },
  { value: "credit", label: "Credit card" },
  { value: "cash", label: "Cash" },
];

const installmentOptions = [1, 2, 3, 4, 6, 12].map((value) => ({
  value: String(value),
  label: value === 1 ? "One-off" : String(value),
}));

export default function ExpenseForm({ form, categories, onChange, onSubmit, submitting = false }) {
  const [errors, setErrors] = useState({});
  const symbol = currencySymbol(loadProfile().currency);

  const updateField = (event) => {
    const { name } = event.target;
    setErrors((current) => current[name] ? { ...current, [name]: "" } : current);
    onChange(event);
  };

  const submitForm = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!String(form.amount).trim()) nextErrors.amount = "Please enter an amount.";
    else if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) nextErrors.amount = `Enter an amount greater than ${symbol}0.`;
    if (!form.category) nextErrors.category = "Please choose a category.";
    if (!form.date) nextErrors.date = "Please choose a date.";
    if (!form.description.trim()) nextErrors.description = "Please add a description.";
    setErrors(nextErrors);

    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      requestAnimationFrame(() => {
        const field = document.getElementById(`expense-${firstError}`);
        (field?.matches("input, button") ? field : field?.querySelector("input, button"))?.focus();
      });
      return;
    }
    onSubmit(event);
  };

  return (
    <section className="panel add-expense-panel">
      <div className="panel-heading add-panel-heading"><h2>Add an expense</h2></div>
      <form className="expense-form" onSubmit={submitForm} noValidate>

        <label className="form-field" htmlFor="expense-description">
          <span className="label">Description</span>
          <Input id="expense-description" name="description" type="text" value={form.description} onChange={updateField} placeholder="What was it for?" required invalid={!!errors.description} describedBy={errors.description ? "expense-description-error" : undefined} />
          {errors.description && <span id="expense-description-error" className="field-error" role="alert">{errors.description}</span>}
        </label>
        
        <label className="form-field expense-amount-field" htmlFor="expense-amount">
          <span className="label">Amount</span>
          <div className="amount-input-wrap">
            <span>{symbol}</span>
            <Input id="expense-amount" name="amount" type="number" min="0.01" value={form.amount} onChange={updateField} placeholder="0.00" required invalid={!!errors.amount} describedBy={errors.amount ? "expense-amount-error" : undefined} />
          </div>
          {errors.amount && <span id="expense-amount-error" className="field-error" role="alert">{errors.amount}</span>}
        </label>

        <label className="form-field" htmlFor="expense-category">
          <span className="label">Category</span>
          <Select id="expense-category" name="category" value={form.category} onChange={updateField} required invalid={!!errors.category} describedBy={errors.category ? "expense-category-error" : undefined} placeholder="Choose a category" options={categories.map((category) => ({ value: category, label: category }))} />
          {errors.category && <span id="expense-category-error" className="field-error" role="alert">{errors.category}</span>}
        </label>

        <div className="form-field">
          <label className="label" htmlFor="expense-date">Date</label>
          <DatePicker key={form.date} id="expense-date" name="date" value={form.date} onChange={updateField} required invalid={!!errors.date} describedBy={errors.date ? "expense-date-error" : undefined} />
          {errors.date && <span id="expense-date-error" className="field-error" role="alert">{errors.date}</span>}
        </div>

      

        <div className="form-row">
          <label className="form-field" htmlFor="expense-payment-type">
            <span className="label">Payment method</span>
            <Select id="expense-payment-type" name="payment_type" value={form.payment_type} onChange={updateField} options={paymentOptions} />
          </label>
          <label className="form-field" htmlFor="expense-installments">
            <span className="label">Installments</span>
            <Select id="expense-installments" name="number_of_installments" value={form.number_of_installments} onChange={updateField} options={installmentOptions} />
          </label>
        </div>

        <Button type="submit" className="add-expense-button" disabled={submitting}><Icon name="plus" size={18} /> {submitting ? "Adding…" : "Add expense"}</Button>
      </form>
    </section>
  );
}
