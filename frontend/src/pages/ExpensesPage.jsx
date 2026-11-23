import { useMemo, useState } from "react";
import Icon from "../components/Icon.jsx";
import Button from "../components/ui/Button.jsx";
import ExpenseForm from "../components/expenses/ExpenseForm.jsx";
import ExpenseList from "../components/expenses/ExpenseList.jsx";
import EditExpenseModal from "../components/expenses/EditExpenseModal.jsx";
import { categories, demoExpenses } from "../data/demoExpenses.js";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(demoExpenses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState({ amount: "", category: "", date: "2026-08-31", description: "", payment_type: "Debit card", number_of_installments: "1" });

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const searchMatch = `${expense.description} ${expense.category}`.toLowerCase().includes(search.toLowerCase());
    const categoryMatch = categoryFilter === "All categories" || expense.category === categoryFilter;
    const dateMatch = !dateRange || (expense.date >= dateRange.start && expense.date <= dateRange.end);
    return searchMatch && categoryMatch && dateMatch;
  }), [expenses, search, categoryFilter, dateRange]);

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const addExpense = (event) => {
    event.preventDefault();
    const newExpense = { ...form, id: Date.now(), amount: Number(form.amount), number_of_installments: Number(form.number_of_installments) };
    setExpenses((current) => [newExpense, ...current]);
    setPage(1);
    setForm((current) => ({ ...current, amount: "", description: "" }));
    setSuccess("Expense added to this preview.");
    window.setTimeout(() => setSuccess(""), 3500);
  };

  const saveExpense = (updatedExpense) => {
    setExpenses((current) => current.map((expense) => expense.id === updatedExpense.id ? updatedExpense : expense));
    setEditingExpense(null);
    setSuccess("Expense updated.");
    window.setTimeout(() => setSuccess(""), 3500);
  };

  const deleteExpense = (expenseToDelete) => {
    if (!window.confirm(`Delete “${expenseToDelete.description}”?`)) return;
    setExpenses((current) => current.filter((expense) => expense.id !== expenseToDelete.id));
    setSuccess("Expense deleted.");
    window.setTimeout(() => setSuccess(""), 3500);
  };

  const exportExpenses = () => {
    const rows = [["Date", "Description", "Category", "Payment type", "Amount"], ...filteredExpenses.map((expense) => [expense.date, expense.description, expense.category, expense.payment_type, expense.amount])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
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

      <div className="expenses-layout">
        <ExpenseForm form={form} categories={categories} onChange={updateForm} onSubmit={addExpense} />
        <ExpenseList
          expenses={expenses}
          filteredExpenses={filteredExpenses}
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
          onDelete={deleteExpense}
        />
      </div>
      {editingExpense && <EditExpenseModal key={editingExpense.id} expense={editingExpense} categories={categories} onClose={() => setEditingExpense(null)} onSave={saveExpense} />}
    </div>
  );
}
