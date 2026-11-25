import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import CategoryExpensesChart from "../components/dashboard/CategoryExpensesChart.jsx";
import ExpensesChart from "../components/dashboard/ExpensesChart.jsx";
import SummaryCard from "../components/dashboard/SummaryCards.jsx";
import SavingsCard from "../components/dashboard/SavingsCard.jsx";
import ExpenseDateRangeFilter from "../components/expenses/ExpenseDateRangeFilter.jsx";
import { buildDashboardReport, getDashboardRange, money } from "../data/dashboardData.js";
import { getSavingsSummary, getSummary } from "../api/expenseApi.js";

const periods = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "year", label: "This year" },
];

export default function DashboardPage() {
  const { profile } = useOutletContext();
  const [period, setPeriod] = useState("month");
  const [customRange, setCustomRange] = useState(null);
  const [request, setRequest] = useState(null);
  const [retry, setRetry] = useState(0);
  const range = getDashboardRange(period, customRange);
  const requestKey = `${period}:${range.start}:${range.end}:${retry}`;
  useEffect(() => {
    let active = true;
    const params = period === "month" || period === "lastMonth"
      ? { month: Number(range.start.slice(5, 7)), year: Number(range.start.slice(0, 4)) }
      : { start: range.start, end: range.end };
    Promise.all([getSummary(params), getSavingsSummary(range.end)])
      .then(([summary, savings]) => { if (active) setRequest({ key: requestKey, data: { summary, savings } }); })
      .catch((error) => { if (active) setRequest({ key: requestKey, error }); });
    return () => { active = false; };
  }, [period, range.start, range.end, requestKey]);

  if (request?.key === requestKey && request.error?.response?.status === 401) return <Navigate to="/login" replace />;
  if (request?.key !== requestKey || request.error) {
    return <div className="dashboard-redesign">
      {request?.key === requestKey
        ? <div className="dashboard-chart-empty" role="alert">Could not load your dashboard. <Button variant="tertiary" onClick={() => setRetry((current) => current + 1)}>Try again</Button></div>
        : <div className="dashboard-chart-empty" role="status">Loading your dashboard…</div>}
    </div>;
  }

  const report = buildDashboardReport(request.data.summary, range, Number(profile.monthlyBudget));
  const budget = report.budget;
  const budgetUsed = budget ? report.total / budget * 100 : 0;
  const comparison = report.comparison == null ? "—" : `${report.comparison > 0 ? "+" : "−"}${Math.abs(report.comparison).toFixed(1)}%`;

  return (
    <div className="dashboard-redesign">
      <header className="app-page-title"><h1>{report.total <= budget ? "Under budget" : "Over budget"}, {profile.firstName}</h1></header>
      <div className="dashboard-period-row">
        <nav className="dashboard-period-tabs" aria-label="Dashboard period">
          {periods.map((option) => <Button key={option.value} variant="tertiary" className={`dashboard-period-tab${period === option.value ? " is-active" : ""}`} aria-pressed={period === option.value} onClick={() => { setPeriod(option.value); setCustomRange(null); }}>{option.label}</Button>)}
        </nav>
        <ExpenseDateRangeFilter value={customRange} placeholder="Custom range" className="dashboard-custom-range" onChange={(range) => { setCustomRange(range); setPeriod("custom"); }} />
      </div>

      <div className="dashboard-top-grid">
        <ExpensesChart report={report} />
        <div className="dashboard-stats-column">
          <SummaryCard label="Total spent" value={money(report.total)} />
          <SummaryCard label={period === "month" ? "Monthly budget" : "Budget"} value={money(budget)} detail={`${Math.round(budgetUsed)}% used`} progress={budgetUsed} />
          <SummaryCard label="Daily average" value={money(report.total / report.dayCount)} />
          <SummaryCard label={period === "month" ? "vs. last month" : "vs. previous period"} value={comparison} tone={report.comparison != null && report.comparison <= 0 ? "positive" : "default"} />
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <CategoryExpensesChart total={report.total} categories={report.categoryBreakdown} />
        <SavingsCard report={report} period={period} monthlySavingsGoal={Number(profile.monthlySavingsGoal)} savings={request.data.savings} emergencyFundTarget={Number(profile.emergencyFundTarget) || 5000} />
      </div>
    </div>
  );
}
