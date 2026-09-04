from calendar import monthrange
from datetime import date

def applies_to_month(expense, year, month):
    if month < 1 or month > 12:
        raise ValueError("month must be between 1 and 12")

    if expense.payment_type.lower() != "credit":
        return expense.date.year == year and expense.date.month == month

    start_index = expense.date.year * 12 + expense.date.month
    selected_index = year * 12 + month
    last_index = start_index + expense.number_of_installments - 1

    return start_index <= selected_index <= last_index

def get_installment_date(start_date, installment_index):
    if installment_index < 0:
        raise ValueError("installment_index must be greater than or equal to 0")

    month_index = start_date.year * 12 + (start_date.month - 1) + installment_index
    year = month_index // 12
    month = (month_index % 12) + 1

    last_day = monthrange(year, month)[1]
    day = min(start_date.day, last_day)

    return date(year, month, day)


def get_expense_amount_for_month(expense):
    if expense.payment_type.lower() == "credit":
        return expense.amount / expense.number_of_installments

    return expense.amount


def get_expenses_until_month(Model, user_id, end_date):
    return (
        Model.query
        .filter(
            Model.user_id == user_id,
            Model.date < end_date,
        )
        .all()
    )


def calculate_monthly_total(Model, user_id, end_date, year, month):
    expenses_for_monthly_total = get_expenses_until_month(Model, user_id, end_date)

    monthly_total = sum(
        get_expense_amount_for_month(expense)
        for expense in expenses_for_monthly_total
        if applies_to_month(expense, year, month)
    )

    return monthly_total
