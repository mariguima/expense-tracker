from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models.user import User
from app.utils.summary import build_savings_summary


savings_bp = Blueprint("savings", __name__)


@savings_bp.route("/savings/summary", methods=["GET"])
@jwt_required()
def get_savings_summary():
    end_value = request.args.get("end")
    if not end_value:
        return jsonify({"error": "An end date is required"}), 400
    try:
        through = date.fromisoformat(end_value)
    except ValueError:
        return jsonify({"error": "Date must use YYYY-MM-DD"}), 400
    if through.year < 1900 or through.year > 9998:
        return jsonify({"error": "Invalid end date"}), 400

    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or user.financial_settings is None:
        return jsonify({"error": "Financial settings not found"}), 404

    return jsonify(build_savings_summary(user.id, through, user.financial_settings.monthly_budget)), 200
