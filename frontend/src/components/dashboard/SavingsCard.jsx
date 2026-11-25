import { ProgressBarBase } from "../base/progress-indicators/progress-indicators";
import { money } from "../../data/dashboardData.js";

export default function SavingsCard({ report, period, monthlySavingsGoal, savings, emergencyFundTarget }) {
  const currentYear = Number(report.end.slice(0, 4));
  const currentMonth = Number(report.end.slice(5, 7));
  const savedAmount = period === "year"
    ? (savings.monthly_savings ?? [])
      .filter(({ year, month }) => year === currentYear && month <= currentMonth)
      .reduce((total, month) => total + Number(month.saved), 0)
    : Math.max(0, report.budget - report.total);
  const goal = period === "year"
    ? (Number(monthlySavingsGoal) || 0) * currentMonth
    : (period === "month" || period === "lastMonth" ? Number(monthlySavingsGoal) || 0 : 0);
  const goalReached = goal > 0 && savedAmount >= goal;
  const goalScale = Math.max(goal, savedAmount);
  const goalProgress = goalScale ? Math.min(100, savedAmount / goalScale * 100) : 0;
  const goalShare = goalScale ? Math.min(goal, savedAmount) / goalScale * 100 : 0;
  const fundAmount = Math.max(0, Number(savings.cumulative_savings) || 0);
  const fundProgress = Math.min(100, fundAmount / emergencyFundTarget * 100);
  const savedLabel = period === "year" ? "Available from budget this year" : "Available from budget";
  const goalTitle = period === "year" ? "Yearly savings goal" : "Monthly savings goal";

  return (
    <section className="panel dashboard-savings-panel">
      <div className="dashboard-savings-header">
        <h2>Savings</h2>
        {goalReached && <span className="dashboard-savings-badge"><span aria-hidden="true">✓</span> Goal available</span>}
      </div>
      <div className="dashboard-savings-total"><span>{savedLabel}</span><strong>{money(savedAmount)}</strong></div>
      {goal > 0 && (
        <div className="dashboard-savings-box dashboard-monthly-goal">
          <h3>{goalTitle}</h3>
          <div className="dashboard-goal-track">
            <ProgressBarBase value={goalProgress} className="dashboard-goal-progress" progressClassName="dashboard-goal-fill" />
            <span className={`dashboard-goal-milestone${goalReached ? " is-reached" : ""}`} style={{ width: `${goalShare}%` }} aria-hidden="true" />
          </div>
          <div className="dashboard-goal-labels">
            <span><i className="dashboard-goal-key" />{money(goal)} goal</span>
            <span><i className="dashboard-extra-key" />{goalReached ? `${money(savedAmount - goal)} extra` : `${money(goal - savedAmount)} to goal`}</span>
          </div>
        </div>
      )}
      <div className="dashboard-savings-box dashboard-fund">
        <div className="dashboard-fund-heading"><h3>Emergency fund</h3><span><strong>{money(fundAmount)}</strong> of {money(emergencyFundTarget)}</span></div>
        <div className="dashboard-fund-track">
          <ProgressBarBase value={fundProgress} className="dashboard-fund-progress" progressClassName="dashboard-fund-fill" />
          {[25, 50, 75].map((mark) => <i key={mark} style={{ left: `${mark}%` }} aria-hidden="true" />)}
        </div>
      </div>
    </section>
  );
}
