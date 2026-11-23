import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import Icon from "../Icon.jsx";
import ExpenseDateRangeFilter from "./ExpenseDateRangeFilter.jsx";

function SearchIcon({ className }) {
  return <Icon name="search" size={16} className={className} />;
}

export default function ExpenseFilters({ search, onSearchChange, categoryFilter, onCategoryFilterChange, dateRange, onDateRangeChange, categories }) {
  const hasFilters = search.trim() || categoryFilter !== "All categories" || dateRange;

  return (
    <div className="expense-filter-bar" role="search" aria-label="Filter expenses">
      <div className="expense-filter-search">
        <Input type="search" name="search" value={search} onChange={onSearchChange} icon={SearchIcon} placeholder="Search expenses" />
      </div>
      <div className="expense-filter-category">
        <Select
          name="categoryFilter"
          value={categoryFilter}
          onChange={onCategoryFilterChange}
          placeholder="All categories"
          options={[{ value: "All categories", label: "All categories" }, ...categories.map((category) => ({ value: category, label: category }))]}
        />
      </div>
      <div className="expense-filter-date"><ExpenseDateRangeFilter value={dateRange} onChange={onDateRangeChange} /></div>
      {hasFilters && <Button variant="secondary" size="sm" className="expense-filter-clear" onClick={() => {
        onSearchChange({ target: { value: "" } });
        onCategoryFilterChange({ target: { value: "All categories" } });
        onDateRangeChange(null);
      }}>Clear</Button>}
    </div>
  );
}
