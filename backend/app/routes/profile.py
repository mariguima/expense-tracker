from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.financial_settings import FinancialSettings
from app.models.user import User
from app.schemas.user_schema import FinancialSettingsSchema, ProfileUpdateSchema, UserSchema
from app.utils.auth import password_matches, session_response
from app.security import audit, limiter


profile_bp = Blueprint("profile", __name__)
settings_schema = FinancialSettingsSchema()
profile_update_schema = ProfileUpdateSchema()
user_schema = UserSchema()


def profile_data(user):
    return {
        "user": user_schema.dump(user),
        "financial_settings": settings_schema.dump(user.financial_settings),
    }


@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        return jsonify({"error": "Account not found"}), 404
    return jsonify(profile_data(user)), 200


@profile_bp.route("/profile", methods=["PATCH"])
@jwt_required()
@limiter.limit("10 per minute", override_defaults=False)
def update_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        return jsonify({"error": "Account not found"}), 404
    try:
        data = profile_update_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    first_name = data["first_name"].strip()
    last_name = data["last_name"].strip()
    if not first_name or not last_name:
        return jsonify({"errors": {"first_name": ["First and last name cannot be blank."]}}), 400

    email_changed = user.email.lower() != data["email"]
    if email_changed:
        if not password_matches(user, data.get("current_password")):
            return jsonify(error="Enter your current password to change your email."), 403
    existing = db.session.execute(select(User).where(func.lower(User.email) == data["email"])).scalar_one_or_none()
    if existing is not None and existing.id != user.id:
        return jsonify({"error": "An account with this email already exists"}), 409

    user.first_name = first_name
    user.last_name = last_name
    user.email = data["email"]
    if user.financial_settings is None:
        user.financial_settings = FinancialSettings()
    for field, value in data["financial_settings"].items():
        setattr(user.financial_settings, field, value)
    if email_changed:
        db.session.execute(update(User).where(User.id == user.id).values(token_version=User.token_version + 1))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="Unable to save these account details."), 409
    audit("profile_updated", user.id)
    return (session_response(user) if email_changed else jsonify(profile_data(user))), 200
