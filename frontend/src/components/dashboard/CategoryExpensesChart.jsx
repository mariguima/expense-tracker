import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent } from "../application/charts/charts-base";
import { money } from "../../data/dashboardData.js";

export default function CategoryExpensesChart({ total, categories }) {
  return (
    <section className="panel dashboard-category-panel">
      <h2>Where it goes</h2>
      {categories.length ? <div className="dashboard-category-chart" role="img" aria-label="Expenses by category">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
          <PieChart>
            <Pie data={categories} dataKey="amount" nameKey="name" innerRadius={51} outerRadius={72} stroke="#fff" strokeWidth={2} paddingAngle={1}>
              {categories.map((category) => <Cell key={category.name} fill={category.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltipContent isPieChart formatter={(value) => `${total ? (Number(value) / total * 100).toFixed(1) : "0.0"}%`} />} />
          </PieChart>
        </ResponsiveContainer>
      </div> : <div className="dashboard-category-chart dashboard-chart-empty">No spending in this date range.</div>}
      <div className="dashboard-category-list">
        {categories.map((category) => (
          <div className="dashboard-category-row" key={category.name}>
            <div><span><i style={{ background: category.color }} />{category.name}</span><strong>{money(category.amount)}</strong></div>
            <div className="dashboard-category-track"><span style={{ width: `${total ? category.amount / total * 100 : 0}%`, background: category.color }} /></div>
          </div>
        ))}
      </div>
      <Link className="dashboard-category-link" to="/expenses">View all categories </Link>
    </section>
  );
}
