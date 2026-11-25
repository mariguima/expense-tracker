import ExpenseFilters from "./ExpenseFilters.jsx";
import ExpenseItem from "./ExpenseItem.jsx";
import Button from "../ui/Button.jsx";
import Icon from "../Icon.jsx";

const PAGE_SIZE = 10;

export default function ExpenseList({ filteredExpenses, loading, loadFailed, page, onPageChange, search, onSearchChange, categoryFilter, onCategoryFilterChange, dateRange, onDateRangeChange, categories, onEdit, onDelete }) {
  const pageCount = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleExpenses = filteredExpenses.slice(start, start + PAGE_SIZE);

  return (
    <section className="panel expense-table-panel">
      <div className="expense-list-topbar">
        <div className="panel-heading expense-list-heading">
          <h2>All expenses</h2>
        </div>
        <ExpenseFilters search={search} onSearchChange={onSearchChange} categoryFilter={categoryFilter} onCategoryFilterChange={onCategoryFilterChange} dateRange={dateRange} onDateRangeChange={onDateRangeChange} categories={categories} />
      </div>
      <div className="expense-table-scroll">
        <table className="expense-table">
          <thead><tr><th scope="col">DESCRIPTION</th><th scope="col">CATEGORY</th><th scope="col">PAYMENT</th><th scope="col" className="amount-column">AMOUNT</th><th scope="col" className="expense-actions-cell"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {visibleExpenses.map((expense) => <ExpenseItem key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />)}
            {!filteredExpenses.length && <tr><td colSpan="5" className="empty-table">{loading ? "Loading expenses…" : loadFailed ? "Expenses could not be loaded." : "No expenses match those filters."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>{filteredExpenses.length ? `${start + 1}–${start + visibleExpenses.length} of ${filteredExpenses.length} expenses` : "No expenses to show"}</span>
        <nav className="expense-pagination" aria-label="Expense pages">
          <span className="pagination-note">Page {currentPage} of {pageCount}</span>
          <Button variant="secondary" className="pagination-button" aria-label="Previous page" title="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><Icon name="chevronLeft" size={15} /></Button>
          <Button variant="secondary" className="pagination-button" aria-label="Next page" title="Next page" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}><Icon name="chevronRight" size={15} /></Button>
        </nav>
      </div>
    </section>
  );
}
