import { ProgressBarBase } from "../base/progress-indicators/progress-indicators";
import { money } from "../../data/dashboardData.js";

const monthlyIncome = 2400;
const emergencyFundTarget = 5000;

export default function SavingsCard({ report, monthlySavingsGoal, emergencyFund }) {
  const saved = monthlyIncome * report.incomeFactor - report.total;
  const savedAmount = Math.max(0, saved);
  const goal = Number(monthlySavingsGoal) || 0;
  const goalReached = goal > 0 && savedAmount >= goal;
  const goalScale = Math.max(goal, savedAmount);
  const goalProgress = goalScale ? Math.min(100, savedAmount / goalScale * 100) : 0;
  const goalShare = goalScale ? Math.min(goal, savedAmount) / goalScale * 100 : 0;
  const fundAmount = Math.max(0, Number(emergencyFund) || 0);
  const fundProgress = Math.min(100, fundAmount / emergencyFundTarget * 100);
  const savedLabel = report.label === "Custom range" ? "Saved in selected period" : `Saved ${report.label.toLowerCase()}`;

  return (
    <section className="panel dashboard-savings-panel">
      <div className="dashboard-savings-header">
        <h2>Savings</h2>
        {goalReached && <span className="dashboard-savings-badge"><span aria-hidden="true">✓</span> Goal reached</span>}
      </div>
      <div className="dashboard-savings-total"><span>{savedLabel}</span><strong>{money(saved)}</strong></div>
      {goal > 0 && (
        <div className="dashboard-savings-box dashboard-monthly-goal">
          <h3>Monthly savings goal</h3>
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
