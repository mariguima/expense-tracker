import { categoryColors } from "./categoryColors.js";
import { loadProfile } from "./profileSettings.js";

export const money = (value) => {
  const { currency, roundAmounts } = loadProfile();
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: ["GBP", "EUR", "USD"].includes(currency) ? currency : "GBP",
    minimumFractionDigits: roundAmounts ? 0 : 2,
    maximumFractionDigits: roundAmounts ? 0 : 2,
  }).format(Number(value) || 0);
};

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const asDate = (value) => new Date(`${value}T12:00:00Z`);
const daysBetween = (start, end) => Math.round((asDate(end) - asDate(start)) / 86400000) + 1;

export function getDashboardRange(period, customRange, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const current = iso(today);
  const ranges = {
    week: {
      start: iso(new Date(year, month, today.getDate() - ((today.getDay() + 6) % 7))),
      end: current,
      label: "This week",
    },
    month: {
      start: iso(new Date(year, month, 1)),
      end: iso(new Date(year, month + 1, 0)),
      label: "This month",
    },
    lastMonth: {
      start: iso(new Date(year, month - 1, 1)),
      end: iso(new Date(year, month, 0)),
      label: "Last month",
    },
    year: { start: iso(new Date(year, 0, 1)), end: current, label: "This year" },
  };
  return period === "custom" && customRange
    ? { ...customRange, label: "Custom range" }
    : ranges[period] || ranges.month;
}

function budgetForRange(monthlyBudget, start, end) {
  let budget = 0;
  const cursor = asDate(start);
  const last = asDate(end);
  while (cursor <= last) {
    const daysInMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
    budget += monthlyBudget / daysInMonth;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return budget;
}

export function buildDashboardReport(summary, range, monthlyBudget, today = new Date()) {
  const dailyAmounts = new Map(summary.daily_expenses.map(({ date, total }) => [date, Number(total)]));
  const dailyPoints = [];
  const cursor = asDate(range.start);
  const last = asDate(range.end);
  while (cursor <= last) {
    const date = cursor.toISOString().slice(0, 10);
    dailyPoints.push({ date, amount: dailyAmounts.get(date) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const monthly = dailyPoints.length > 45;
  const points = monthly
    ? Array.from(dailyPoints.reduce((months, point) => {
        const key = point.date.slice(0, 7);
        months.set(key, (months.get(key) || 0) + point.amount);
        return months;
      }, new Map()), ([key, amount]) => ({
        label: new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
        amount: Number(amount.toFixed(2)),
      }))
    : dailyPoints.map((point) => ({
        label: asDate(point.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
        amount: point.amount,
      }));

  const todayKey = iso(today);
  const elapsedEnd = range.end < todayKey ? range.end : todayKey;
  const dayCount = Math.max(1, daysBetween(range.start, elapsedEnd));
  const categoryBreakdown = summary.category_expenses.map(({ category, total }) => ({
    name: category,
    amount: Number(total),
    color: (categoryColors[category] || categoryColors.Other).chart,
  }));

  return {
    ...range,
    total: Number(summary.total),
    comparison: summary.period_over_period_percentage == null ? null : Number(summary.period_over_period_percentage),
    chartData: points,
    categoryBreakdown,
    monthly,
    dayCount,
    budget: budgetForRange(monthlyBudget, range.start, range.end),
  };
}
