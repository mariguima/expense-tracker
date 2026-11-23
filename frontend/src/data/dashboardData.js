import { categoryColors } from "./categoryColors.js";

const monthlyTotals = [1186, 1320, 1282, 1410, 1175, 1328, 1399.35, 1284.6];

export const categoryBreakdown = [
  { name: "Home", amount: 720, color: categoryColors.Home.chart },
  { name: "Food & dining", amount: 182.1, color: categoryColors["Food & dining"].chart },
  { name: "Shopping", amount: 179.99, color: categoryColors.Shopping.chart },
  { name: "Transport", amount: 85.5, color: categoryColors.Transport.chart },
  { name: "Bills", amount: 117.01, color: categoryColors.Bills.chart },
];

export const money = (value) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);

const dayKey = (year, month, day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const dailySpending = monthlyTotals.flatMap((target, monthIndex) => {
  const month = monthIndex + 1;
  const days = new Date(2026, month, 0).getDate();
  const weights = Array.from({ length: days }, (_, index) => 18 + ((index * 17 + month * 11) % 44) + (index % 7 === 0 ? 14 : 0));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let allocated = 0;

  return weights.map((weight, index) => {
    const amount = index === days - 1 ? Number((target - allocated).toFixed(2)) : Number((target * weight / weightTotal).toFixed(2));
    allocated += amount;
    return { date: dayKey(2026, month, index + 1), amount };
  });
});

const shiftDate = (isoDate, days) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const daysBetween = (start, end) => Math.max(1, Math.round((new Date(`${end}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / 86400000) + 1);

export function getDashboardReport(period, customRange) {
  const ranges = {
    week: { start: "2026-08-25", end: "2026-08-31", label: "This week" },
    month: { start: "2026-08-01", end: "2026-08-31", label: "This month" },
    lastMonth: { start: "2026-07-01", end: "2026-07-31", label: "Last month" },
    year: { start: "2026-01-01", end: "2026-08-31", label: "This year" },
  };
  const selected = period === "custom" && customRange ? { ...customRange, label: "Custom range" } : ranges[period] || ranges.month;
  const dayCount = daysBetween(selected.start, selected.end);
  const entries = dailySpending.filter(({ date }) => date >= selected.start && date <= selected.end);
  const total = Number(entries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2));
  const previousEnd = shiftDate(selected.start, -1);
  const previousStart = shiftDate(previousEnd, 1 - dayCount);
  const previousTotal = dailySpending.filter(({ date }) => date >= previousStart && date <= previousEnd).reduce((sum, entry) => sum + entry.amount, 0);
  const comparison = previousTotal > 0 ? (total / previousTotal - 1) * 100 : null;
  const monthly = dayCount > 45;
  const points = monthly
    ? Object.values(entries.reduce((months, entry) => {
        const key = entry.date.slice(0, 7);
        months[key] ||= { key, amount: 0 };
        months[key].amount += entry.amount;
        return months;
      }, {})).map((entry) => ({ label: new Date(`${entry.key}-01T12:00:00`).toLocaleDateString("en-GB", { month: "short" }), amount: Number(entry.amount.toFixed(2)) }))
    : entries.map((entry) => ({ label: new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), amount: entry.amount }));

  const chartData = points.map((point, index) => ({
    ...point,
    trend: Number((points.slice(Math.max(0, index - 4), index + 1).reduce((sum, item) => sum + item.amount, 0) / Math.min(index + 1, 5)).toFixed(2)),
  }));

  return { ...selected, dayCount, total, comparison, chartData, monthly, budget: 2000 * dayCount / 31, incomeFactor: dayCount / 31 };
}
