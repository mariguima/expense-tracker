from datetime import date as date_type
from decimal import Decimal, InvalidOperation

from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.expense import Expense
from app import db

expense_bp = Blueprint("expense", __name__)

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

    
