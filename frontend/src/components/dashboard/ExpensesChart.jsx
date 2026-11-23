import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipContent } from "../application/charts/charts-base";
import { money } from "../../data/dashboardData.js";

const shortDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function ExpensesChart({ report }) {
  const { chartData, monthly, start, end } = report;
  const tickInterval = chartData.length > 12 ? Math.max(0, Math.ceil(chartData.length / 6) - 1) : 0;

  return (
    <section className="panel dashboard-chart-panel">
      <div className="dashboard-chart-heading">
        <div><h2>Spending over time</h2><p>{monthly ? "Monthly" : "Daily"} · {shortDate(start)} – {shortDate(end)}</p></div>
        <span className="dashboard-chart-legend"><i />Spent per {monthly ? "month" : "day"}</span>
      </div>
      {chartData.length ? (
        <div className="dashboard-bar-chart" role="img" aria-label={`Spending from ${shortDate(start)} to ${shortDate(end)}`}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
            <ComposedChart data={chartData} margin={{ top: 12, right: 4, left: -22, bottom: 0 }} barCategoryGap="15%">
              <CartesianGrid vertical={false} stroke="#f0edec" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} interval={tickInterval} tick={{ fill: "#aaa2a5", fontSize: 9 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#aaa2a5", fontSize: 9 }} tickFormatter={(value) => `£${value}`} width={42} />
              <Tooltip content={<ChartTooltipContent />} formatter={(value) => money(Number(value))} cursor={{ fill: "#fff1f2" }} />
              <Bar dataKey="amount" name="Spent" fill="#F07D8E" maxBarSize={monthly ? 28 : 12} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="dashboard-chart-empty">No spending in this date range.</div>}
    </section>
  );
}
