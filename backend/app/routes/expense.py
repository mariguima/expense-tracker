from calendar import monthrange
from datetime import date as date_type

from marshmallow import ValidationError
from flask import jsonify, request, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.expense import Expense
from app import db
from app.utils.summary import build_summary
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
    start_value = request.args.get("start")
    end_value = request.args.get("end")

    if start_value is not None or end_value is not None:
        if not start_value or not end_value:
            return jsonify({"error": "Start and end dates are required"}), 400
        try:
            start = date_type.fromisoformat(start_value)
            end = date_type.fromisoformat(end_value)
        except ValueError:
            return jsonify({"error": "Dates must use YYYY-MM-DD"}), 400
        calendar_month = False
    else:
        month = request.args.get("month", type=int)
        year = request.args.get("year", type=int)
        if month is None or year is None:
            return jsonify({"error": "Month and year, or start and end dates, are required"}), 400
        if not 1 <= month <= 12 or not 1900 <= year <= 9998:
            return jsonify({"error": "Invalid month or year"}), 400
        start = date_type(year, month, 1)
        end = date_type(year, month, monthrange(year, month)[1])
        calendar_month = True

    if start.year < 1900 or end.year > 9998 or end < start or (end - start).days > 3660:
        return jsonify({"error": "Choose a valid range of up to 10 years"}), 400

    result = build_summary(user_id, start, end, calendar_month)
    if calendar_month:
        result["month"] = start.month
        result["year"] = start.year
    return jsonify(result), 200
