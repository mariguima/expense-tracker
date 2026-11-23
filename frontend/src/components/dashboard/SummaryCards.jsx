import { ProgressBarBase } from "../base/progress-indicators/progress-indicators";

export default function SummaryCard({ label, value, detail, progress, tone = "default" }) {
  return (
    <article className={`dashboard-stat-card dashboard-stat-${tone}`}>
      <div className="dashboard-stat-topline"><span>{label}</span>{detail && <span>{detail}</span>}</div>
      <strong>{value}</strong>
      {progress != null && <ProgressBarBase value={Math.min(100, Math.max(0, progress))} className="dashboard-stat-track" progressClassName="dashboard-progress-fill" />}
    </article>
  );
}
