from datetime import date as date_type
from decimal import Decimal, InvalidOperation

from marshmallow import ValidationError
from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.expense import Expense
from app import db
from app.utils.expense_helpers import applies_to_month, get_installment_date, calculate_monthly_total, get_expense_amount_for_month, get_expenses_until_month
from app.schemas.expense_schema import ExpenseCreateSchema, ExpenseSchema, ExpenseUpdateSchema

expense_bp = Blueprint("expense", __name__)

# schemas
expense_create_schema = ExpenseCreateSchema()
expense_update_schema = ExpenseUpdateSchema()
expense_schema = ExpenseSchema()
expenses_schema = ExpenseSchema(many=True)

# ================ CRUD OPERATIONS =======================================

# show expense list
@expense_bp.route("/expenses", methods=["GET"])
@jwt_required()
def get_expense():
    user_id = int(get_jwt_identity())
    expenses = Expense.query.filter_by(user_id=user_id).all()
    result = expenses_schema.dump(expenses)

    return jsonify(result), 200

# add a new expense
@expense_bp.route("/expenses", methods=["POST"])
@jwt_required()
def post_expense():
    user_id = int(get_jwt_identity())
    try:
        data = expense_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    new_expense = Expense(
        user_id=user_id, 
        amount=data["amount"], 
        category=data["category"], 
        date=data["date"], 
        payment_type=data["payment_type"], 
        number_of_installments=data["number_of_installments"], 
        description=data["description"]
    )

    db.session.add(new_expense)
    db.session.commit()

    return jsonify({"message": "Expense created successfully", "expense_id": new_expense.id}), 201

# edit an expense
@expense_bp.route("/expenses/<int:expense_id>", methods=["PATCH"])
@jwt_required()
def patch_expense(expense_id):
    user_id = int(get_jwt_identity())
    expense = Expense.query.filter_by(user_id=user_id, id=expense_id).first()
    if expense is None:
        return jsonify({"error": "Expense not found"}), 404

    try:
        data = expense_update_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    for field, value in data.items():
        setattr(expense, field, value)

    db.session.commit()
    return jsonify({"message": "Expense updated successfully", "expense": expense_schema.dump(expense)}), 200

# delete an expense
@expense_bp.route("/expenses/<int:expense_id>", methods=["DELETE"])
@jwt_required()
def delete_expense(expense_id):
    user_id = int(get_jwt_identity())
    expense = Expense.query.filter_by(user_id=user_id, id=expense_id).first()
    if expense is None:
        return jsonify({"error": "Expense not found"}), 404

    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted successfully"}), 200

# ================== DASHBOARD ======================================
@expense_bp.route("/expenses/summary", methods=["GET"])
@jwt_required()
def get_summary():
    user_id = int(get_jwt_identity())
    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)

    if month is None or year is None:
        return jsonify({"error": "Month and year are required"}), 400

    if month < 1 or month > 12:
        return jsonify({"error": "Month must be between 1 and 12"}), 400

    start_date = date_type(year, month, 1)
    if month == 12:
        end_date = date_type(year + 1, 1, 1)
    else:
        end_date = date_type(year, month + 1, 1)

    if month == 1:
        previous_month = 12
        previous_month_year = year - 1
    else:
        previous_month = month - 1
        previous_month_year = year
    previous_month_end_date = start_date

    year_start_date = date_type(year, 1, 1)
    year_end_date = date_type(year + 1, 1, 1)

    # get total amount spent in the month, including active credit installments
    monthly_total = calculate_monthly_total(Expense, user_id, end_date, year, month)
    expenses_for_monthly_total = get_expenses_until_month(Expense, user_id, end_date)

    # get previous month total expenses and credit installments
    previous_month_total = calculate_monthly_total(Expense, user_id, previous_month_end_date, previous_month_year, previous_month)

    # get daily totals for the selected month, including credit installment dates
    expenses_for_daily_totals = (
        Expense.query
        .filter(
            Expense.user_id == user_id,
            Expense.date < end_date,
        )
        .all()
    )

    daily_totals = {}
    for expense in expenses_for_daily_totals:
        if expense.payment_type.lower() == "credit":
            installment_amount = expense.amount / expense.number_of_installments

            for installment_index in range(expense.number_of_installments):
                installment_date = get_installment_date(expense.date, installment_index)

                if start_date <= installment_date < end_date:
                    daily_totals[installment_date] = (
                        daily_totals.get(installment_date, Decimal("0")) + installment_amount
                    )
        elif start_date <= expense.date < end_date:
            daily_totals[expense.date] = daily_totals.get(expense.date, Decimal("0")) + expense.amount

    daily_expenses = [
        {
            "date": expense_date.isoformat(),
            "total": str(total),
        }
        for expense_date, total in sorted(daily_totals.items())
    ]

    monthly_totals_by_month = {month_number: Decimal("0") for month_number in range(1, 13)}
    expenses_for_yearly_totals = (
        Expense.query
        .filter(
            Expense.user_id == user_id,
            Expense.date < year_end_date,
        )
        .all()
    )

    for expense in expenses_for_yearly_totals:
        if expense.payment_type.lower() == "credit":
            installment_amount = expense.amount / expense.number_of_installments

            for installment_index in range(expense.number_of_installments):
                installment_date = get_installment_date(expense.date, installment_index)

                if year_start_date <= installment_date < year_end_date:
                    monthly_totals_by_month[installment_date.month] += installment_amount
        elif year_start_date <= expense.date < year_end_date:
            monthly_totals_by_month[expense.date.month] += expense.amount

    monthly_expenses = [
        {
            "month": month_number,
            "total": str(total),
        }
        for month_number, total in monthly_totals_by_month.items()
    ]

    if previous_month_total == 0:
        month_over_month_percentage = None
    else:
        month_over_month_percentage = ((monthly_total - previous_month_total) / previous_month_total) * 100

    # get each category total for the selected month, including credit installments
    category_totals = {}
    for expense in expenses_for_monthly_total:
        if not applies_to_month(expense, year, month):
            continue

        amount = get_expense_amount_for_month(expense)
        category_totals[expense.category] = (
            category_totals.get(expense.category, Decimal("0")) + amount
        )

    category_expenses = [
        {
            "category": category,
            "total": str(total),
        }
        for category, total in sorted(
            category_totals.items(),
            key=lambda category_total: category_total[1],
            reverse=True,
        )
    ]

    return jsonify({
        "month": month,
        "year": year,
        "total": str(monthly_total),
        "daily_expenses": daily_expenses,
        "monthly_expenses": monthly_expenses,
        "previous_month_total": str(previous_month_total),
        "month_over_month_percentage": (
            None if month_over_month_percentage is None else str(month_over_month_percentage)
        ),
        "category_expenses": category_expenses
    }), 200
