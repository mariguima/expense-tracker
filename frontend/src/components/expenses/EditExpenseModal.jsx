import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import DatePicker from "../ui/DatePicker.jsx";
import { currencySymbol, loadProfile } from "../../data/profileSettings.js";

const paymentMethods = [
  { value: "debit", label: "Debit card" },
  { value: "credit", label: "Credit card" },
  { value: "cash", label: "Cash" },
];
const installmentCounts = [1, 2, 3, 4, 6, 12];

export default function EditExpenseModal({ expense, categories, onClose, onSave, saving = false, error = "" }) {
  const symbol = currencySymbol(loadProfile().currency);
  const [draft, setDraft] = useState({
    description: expense.description || "",
    amount: String(expense.amount),
    category: expense.category,
    date: expense.date,
    payment_type: expense.payment_type,
    number_of_installments: String(expense.number_of_installments || 1),
  });
  const [errors, setErrors] = useState({});
  const update = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };
  const save = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!draft.description.trim()) nextErrors.description = "Please add a description.";
    if (!draft.amount.trim() || !Number.isFinite(Number(draft.amount)) || Number(draft.amount) <= 0) nextErrors.amount = `Enter an amount greater than ${symbol}0.`;
    if (!draft.category) nextErrors.category = "Please choose a category.";
    if (!draft.date) nextErrors.date = "Please choose a date.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave({
      ...expense,
      ...draft,
      description: draft.description.trim(),
      amount: Number(draft.amount),
      number_of_installments: Number(draft.number_of_installments),
    });
  };
  const paymentOptions = paymentMethods.some(({ value }) => value === draft.payment_type)
    ? paymentMethods
    : [{ value: draft.payment_type, label: draft.payment_type }, ...paymentMethods];
  const installmentOptions = [...new Set([...installmentCounts, Number(draft.number_of_installments)])].sort((a, b) => a - b).map((value) => ({ value: String(value), label: value === 1 ? "One-off" : String(value) }));

  return (
    <Modal isOpen title="Edit expense" onClose={onClose} className="expense-edit-modal">
      <form className="expense-edit-form" onSubmit={save} noValidate>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-field"><label className="label" htmlFor="edit-description">Description</label><Input id="edit-description" name="description" value={draft.description} onChange={update} invalid={!!errors.description} />{errors.description && <span className="field-error" role="alert">{errors.description}</span>}</div>
        <div className="form-field expense-amount-field"><label className="label" htmlFor="edit-amount">Amount</label><div className="amount-input-wrap"><span aria-hidden="true">{symbol}</span><Input id="edit-amount" name="amount" type="number" min="0.01" step="0.01" value={draft.amount} onChange={update} invalid={!!errors.amount} /></div>{errors.amount && <span className="field-error" role="alert">{errors.amount}</span>}</div>
        <div className="form-field"><label className="label" htmlFor="edit-category">Category</label><Select id="edit-category" name="category" value={draft.category} options={categories.map((value) => ({ value, label: value }))} onChange={update} invalid={!!errors.category} />{errors.category && <span className="field-error" role="alert">{errors.category}</span>}</div>
        <div className="form-field"><label className="label" htmlFor="edit-date">Date</label><DatePicker id="edit-date" name="date" value={draft.date} onChange={update} invalid={!!errors.date} />{errors.date && <span className="field-error" role="alert">{errors.date}</span>}</div>
        <div className="form-row">
          <div className="form-field"><label className="label" htmlFor="edit-payment">Payment method</label><Select id="edit-payment" name="payment_type" value={draft.payment_type} options={paymentOptions} onChange={update} /></div>
          <div className="form-field"><label className="label" htmlFor="edit-installments">Installments</label><Select id="edit-installments" name="number_of_installments" value={draft.number_of_installments} options={installmentOptions} onChange={update} /></div>
        </div>
        <div className="expense-edit-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>
      </form>
    </Modal>
  );
}
