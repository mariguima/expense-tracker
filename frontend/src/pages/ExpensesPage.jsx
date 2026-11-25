import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Button from "../components/ui/Button.jsx";
import ExpenseForm from "../components/expenses/ExpenseForm.jsx";
import ExpenseList from "../components/expenses/ExpenseList.jsx";
import EditExpenseModal from "../components/expenses/EditExpenseModal.jsx";
import { categories } from "../data/demoExpenses.js";
import { deleteExpense, getExpenses, patchExpense, postExpense } from "../api/expenseApi.js";

const localToday = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const initialForm = () => ({
  amount: "",
  category: "",
  date: localToday(),
  description: "",
  payment_type: "debit",
  number_of_installments: "1",
});

function getErrorMessage(error, fallback) {
  const response = error.response?.data;
  if (response?.error) return response.error;
  if (response?.errors) return Object.values(response.errors).flat().join(" ");
  return fallback;
}

function toApiExpense(expense) {
  const paymentType = String(expense.payment_type).toLowerCase();
  return {
    amount: Number(expense.amount),
    category: expense.category,
    date: expense.date,
    payment_type: paymentType.includes("credit") ? "credit" : paymentType.includes("cash") ? "cash" : "debit",
    number_of_installments: Number(expense.number_of_installments),
    description: expense.description.trim(),
  };
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingError, setEditingError] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {

    let active = true;
    getExpenses()
      .then((data) => {
        if (active) setExpenses(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!active) return;
        setLoadFailed(true);
        setErrorMessage(getErrorMessage(error, "Unable to load your expenses."));
        if (error.response?.status === 401) {
          navigate("/login", { replace: true });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const searchMatch = `${expense.description || ""} ${expense.category || ""}`.toLowerCase().includes(search.toLowerCase());
    const categoryMatch = categoryFilter === "All categories" || expense.category === categoryFilter;
    const dateMatch = !dateRange || (expense.date >= dateRange.start && expense.date <= dateRange.end);
    return searchMatch && categoryMatch && dateMatch;
  }), [expenses, search, categoryFilter, dateRange]);

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const resetMessages = () => {
    setSuccess("");
    setErrorMessage("");
  };

  const showSuccess = (message) => {
    setSuccess(message);
  };

  const finishWithError = (error, fallback) => {
    setErrorMessage(getErrorMessage(error, fallback));
    if (error.response?.status === 401) {
      navigate("/login", { replace: true });
    }
  };

  const addExpense = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    const payload = toApiExpense(form);
    resetMessages();
    setIsSaving(true);
    try {
      const result = await postExpense(payload);
      setExpenses((current) => [{ ...payload, id: result.expense_id }, ...current]);
      setPage(1);
      setForm((current) => ({ ...current, amount: "", description: "" }));
      showSuccess("Expense added.");
    } catch (error) {
      finishWithError(error, "Unable to add this expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveExpense = async (updatedExpense) => {
    if (isSaving) return;
    resetMessages();
    setEditingError("");
    setIsSaving(true);
    try {
      const result = await patchExpense(updatedExpense.id, toApiExpense(updatedExpense));
      const savedExpense = result.expense || { ...toApiExpense(updatedExpense), id: updatedExpense.id };
      setExpenses((current) => current.map((expense) => expense.id === updatedExpense.id ? savedExpense : expense));
      setEditingExpense(null);
      showSuccess("Expense updated.");
    } catch (error) {
      setEditingError(getErrorMessage(error, "Unable to update this expense."));
      if (error.response?.status === 401) {
          navigate("/login", { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const removeExpense = async (expenseToDelete) => {
    if (isSaving) return;
    if (!window.confirm(`Delete “${expenseToDelete.description}”?`)) return;
    resetMessages();
    setIsSaving(true);
    try {
      await deleteExpense(expenseToDelete.id);
      setExpenses((current) => current.filter((expense) => expense.id !== expenseToDelete.id));
      showSuccess("Expense deleted.");
    } catch (error) {
      finishWithError(error, "Unable to delete this expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportExpenses = () => {
    const rows = [["Date", "Description", "Category", "Payment type", "Amount"], ...filteredExpenses.map((expense) => [expense.date, expense.description, expense.category, expense.payment_type, expense.amount])];
    const csv = rows.map((row) => row.map((cell) => `"${( /^[\s]*[=+@-]/.test(String(cell)) ? `'${cell}` : String(cell)).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "expense-tracker-expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="expenses-page">
      <header className="app-page-title">
        <h1>Expenses</h1>
        <div className="expenses-heading-actions"><Button variant="secondary" className="quiet-button export-button" onClick={exportExpenses}><Icon name="download" size={17} /> Export CSV</Button></div>
      </header>

      {success && <div className="success-banner" role="status"><span>✓</span>{success}</div>}
      {errorMessage && <div className="form-error" role="alert">{errorMessage}</div>}

      <div className="expenses-layout">
        <ExpenseForm form={form} categories={categories} onChange={updateForm} onSubmit={addExpense} submitting={isSaving} />
        <ExpenseList
          filteredExpenses={filteredExpenses}
          loading={loading}
          loadFailed={loadFailed}
          page={page}
          onPageChange={setPage}
          search={search}
          onSearchChange={(event) => { setSearch(event.target.value); setPage(1); }}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}
          dateRange={dateRange}
          onDateRangeChange={(range) => { setDateRange(range); setPage(1); }}
          categories={categories}
          onEdit={setEditingExpense}
          onDelete={removeExpense}
        />
      </div>
      {editingExpense && <EditExpenseModal key={editingExpense.id} expense={editingExpense} categories={categories} onClose={() => { setEditingExpense(null); setEditingError(""); }} onSave={saveExpense} saving={isSaving} error={editingError} />}
    </div>
  );
}
