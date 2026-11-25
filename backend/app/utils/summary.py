from collections import defaultdict
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from app.models.expense import Expense
from app.utils.expense_helpers import get_installment_date


ZERO = Decimal("0")
PENNY = Decimal("0.01")


def month_before(day):
    return date(day.year - 1, 12, 1) if day.month == 1 else date(day.year, day.month - 1, 1)


def previous_range(start, end, calendar_month=False):
    if calendar_month:
        previous_start = month_before(start)
        return previous_start, start - timedelta(days=1)
    days = (end - start).days + 1
    return start - timedelta(days=days), start - timedelta(days=1)


def occurrences(expense, start, end):
    if expense.payment_type.lower() != "credit":
        if start <= expense.date <= end:
            yield expense.date, expense.amount
        return

    first_month = expense.date.year * 12 + expense.date.month
    start_index = max(0, start.year * 12 + start.month - first_month)
    end_index = min(
        expense.number_of_installments - 1,
        end.year * 12 + end.month - first_month,
    )
    for installment_index in range(start_index, end_index + 1):
        installment_date = get_installment_date(expense.date, installment_index)
        if start <= installment_date <= end:
            yield installment_date, expense.amount / expense.number_of_installments


def money_string(amount):
    return str(amount.quantize(PENNY))


def build_summary(user_id, start, end, calendar_month=False):
    prior_start, prior_end = previous_range(start, end, calendar_month)
    expenses = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.date <= end,
    ).all()

    daily_totals = defaultdict(lambda: ZERO)
    category_totals = defaultdict(lambda: ZERO)
    previous_total = ZERO
    for expense in expenses:
        for day, amount in occurrences(expense, start, end):
            daily_totals[day] += amount
            category_totals[expense.category] += amount
        for _, amount in occurrences(expense, prior_start, prior_end):
            previous_total += amount

    total = sum(daily_totals.values(), ZERO)
    monthly_totals = defaultdict(lambda: ZERO)
    for day, amount in daily_totals.items():
        monthly_totals[(day.year, day.month)] += amount

    comparison = None if previous_total == 0 else (total - previous_total) / previous_total * 100
    comparison_string = None if comparison is None else str(comparison.quantize(PENNY))
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "total": money_string(total),
        "daily_expenses": [
            {"date": day.isoformat(), "total": money_string(amount)}
            for day, amount in sorted(daily_totals.items())
        ],
        "monthly_expenses": [
            {"year": year, "month": month, "total": money_string(amount)}
            for (year, month), amount in sorted(monthly_totals.items())
        ],
        "previous_period_total": money_string(previous_total),
        "previous_month_total": money_string(previous_total) if calendar_month else None,
        "period_over_period_percentage": comparison_string,
        "month_over_month_percentage": comparison_string if calendar_month else None,
        "category_expenses": [
            {"category": category, "total": money_string(amount)}
            for category, amount in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        ],
    }


def build_savings_summary(user_id, through, monthly_budget):
    expenses = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.date <= through,
    ).order_by(Expense.date).all()
    if not expenses:
        return {"as_of": through.isoformat(), "cumulative_savings": "0.00", "monthly_savings": []}

    first_date = expenses[0].date
    start = date(first_date.year, first_date.month, 1)
    spent_by_month = defaultdict(lambda: ZERO)
    for expense in expenses:
        for day, amount in occurrences(expense, start, through):
            spent_by_month[(day.year, day.month)] += amount

    monthly_savings = []
    cumulative = ZERO
    cursor = start
    while cursor <= through:
        days_in_month = monthrange(cursor.year, cursor.month)[1]
        days_counted = min(days_in_month, through.day) if (cursor.year, cursor.month) == (through.year, through.month) else days_in_month
        budget = monthly_budget * Decimal(days_counted) / Decimal(days_in_month)
        spent = spent_by_month[(cursor.year, cursor.month)]
        saved = max(ZERO, budget - spent)
        cumulative += saved
        monthly_savings.append({
            "year": cursor.year,
            "month": cursor.month,
            "budget": money_string(budget),
            "spent": money_string(spent),
            "saved": money_string(saved),
        })
        cursor = date(cursor.year + 1, 1, 1) if cursor.month == 12 else date(cursor.year, cursor.month + 1, 1)

    return {
        "as_of": through.isoformat(),
        "cumulative_savings": money_string(cumulative),
        "monthly_savings": monthly_savings,
    }
