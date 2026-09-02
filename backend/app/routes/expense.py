from datetime import date as date_type
from decimal import Decimal, InvalidOperation

from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.expense import Expense
from app import db

expense_bp = Blueprint("expense", __name__)

# ================ CRUD OPERATIONS =======================================

# show expense list
@expense_bp.route("/expenses", methods=["GET"])
@jwt_required()
def expense_page():
    user_id = int(get_jwt_identity())
    expenses = Expense.query.filter_by(user_id=user_id).all()
    result = [
        {
            "id": e.id,
            "amount": str(e.amount),
            "category": e.category,
            "date": e.date.isoformat(),
            "payment_type": e.payment_type,
            "number_of_installments": e.number_of_installments,
            "description": e.description,
        }
        for e in expenses
    ]

    return jsonify(result), 200

# add a new expense
@expense_bp.route("/expenses", methods=["POST"])
@jwt_required()
def post_expense():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    amount = data.get("amount")
    category = data.get("category")
    date = data.get("date")
    payment_type = data.get("payment_type")
    number_of_installments = data.get("number_of_installments")
    description = data.get("description")

    if amount is None or not category or not date or not payment_type or number_of_installments is None:
        return jsonify({"error": "Amount, category, date, payment type and number of installments are required"}), 400

    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, ValueError):
        return jsonify({"error": "Amount must be a valid number"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    try:
        date = date_type.fromisoformat(date)
    except (TypeError, ValueError):
        return jsonify({"error": "Date must use YYYY-MM-DD format"}), 400

    try:
        number_of_installments = int(number_of_installments)
    except (TypeError, ValueError):
        return jsonify({"error": "Number of installments must be an integer"}), 400

    if number_of_installments <= 0:
        return jsonify({"error": "Number of installments must be greater than zero"}), 400

    new_expense = Expense(user_id=user_id, amount=amount, category=category, date=date, payment_type=payment_type, number_of_installments=number_of_installments, description=description)

    db.session.add(new_expense)
    db.session.commit()

    return jsonify({"message": "Expense created successfully", "expense_id": new_expense.id}), 201

# edit an expense
@expense_bp.route("/expenses/<int:expense_id>", methods=["PATCH"])
@jwt_required()
def patch_expense(expense_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    expense = Expense.query.filter_by(user_id=user_id, id=expense_id).first()

    if expense is None:
        return jsonify({"error": "Expense not found"}), 404

    if "amount" in data:
        try:
            amount = Decimal(str(data["amount"]))
        except (InvalidOperation, ValueError):
            return jsonify({"error": "Amount must be a valid number"}), 400

        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400

        expense.amount = amount

    if "category" in data:
        if not data["category"]:
            return jsonify({"error": "Category cannot be empty"}), 400
        expense.category = data["category"]

    if "date" in data:
        try:
            expense.date = date_type.fromisoformat(data["date"])
        except (TypeError, ValueError):
            return jsonify({"error": "Date must use YYYY-MM-DD format"}), 400

    if "payment_type" in data:
        if not data["payment_type"]:
            return jsonify({"error": "Payment type cannot be empty"}), 400
        expense.payment_type = data["payment_type"]

    if "number_of_installments" in data:
        try:
            number_of_installments = int(data["number_of_installments"])
        except (TypeError, ValueError):
            return jsonify({"error": "Number of installments must be an integer"}), 400

        if number_of_installments <= 0:
            return jsonify({"error": "Number of installments must be greater than zero"}), 400

        expense.number_of_installments = number_of_installments

    if "description" in data:
        expense.description = data["description"]

    db.session.commit()
    return jsonify({"message": "Expense updated successfully"}), 200



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

# ================== DASHBOARD OPERATIONS ======================================
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
        previous_month_start_date = date_type(year - 1, 12, 1)
    else:
        previous_month_start_date = date_type(year, month - 1, 1)
    previous_month_end_date = start_date

    year_start_date = date_type(year, 1, 1)
    year_end_date = date_type(year + 1, 1, 1)

    # get total amount spent in the month
    monthly_total = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == user_id,
            Expense.date >= start_date,
            Expense.date < end_date,
        )
        .scalar()
    )

    # get previous month total expenses
    previous_month_total = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == user_id,
            Expense.date >= previous_month_start_date,
            Expense.date < previous_month_end_date,
        )
        .scalar()
    )

    # get date and amount spent thoughout the month
    daily_rows = (
        db.session.query(Expense.date, db.func.sum(Expense.amount))
        .filter(
            Expense.user_id == user_id,
            Expense.date >= start_date,
            Expense.date < end_date,
        )
        .group_by(Expense.date)
        .order_by(Expense.date)
        .all()
    )

    daily_expenses = [
        {
            "date": expense_date.isoformat(),
            "total": str(total),
        }
        for expense_date, total in daily_rows
    ]

    yearly_rows = (
        db.session.query(Expense.date, db.func.sum(Expense.amount))
        .filter(
            Expense.user_id == user_id,
            Expense.date >= year_start_date,
            Expense.date < year_end_date,
        )
        .group_by(Expense.date)
        .all()
    )

    monthly_totals_by_month = {month_number: Decimal("0") for month_number in range(1, 13)}
    for expense_date, total in yearly_rows:
        monthly_totals_by_month[expense_date.month] += total

    

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

    # get each category expenses
    category_total = db.func.sum(Expense.amount)
    category_rows = (
        db.session.query(Expense.category, category_total)
        .filter(
            Expense.user_id == user_id,
            Expense.date >= start_date,
            Expense.date < end_date,
        )
        .group_by(Expense.category)
        .order_by(category_total.desc())
        .all()
    )

    category_expenses = [
        {
            "category": category,
            "total": str(total),
        }
        for category, total in category_rows
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
