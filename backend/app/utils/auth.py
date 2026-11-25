"""Password verification and browser sessions shared by authentication routes."""
from flask import current_app, jsonify
from flask_jwt_extended import create_access_token, set_access_cookies

from app import bcrypt
from app.schemas.user_schema import FinancialSettingsSchema, UserSchema


def password_matches(user, password):
    if not isinstance(password, str) or not 1 <= len(password) <= 128 or len(password.encode("utf-8")) > 72:
        return False
    hashed = user.password_hash if user else current_app.config["DUMMY_PASSWORD_HASH"]
    try:
        matches = bcrypt.check_password_hash(hashed, password)
    except ValueError:
        return False
    return user is not None and matches


def session_response(user, **extra):
    token = create_access_token(identity=str(user.id))
    data = {"user": UserSchema().dump(user),
            "financial_settings": FinancialSettingsSchema().dump(user.financial_settings), **extra}
    # Header transport is available for explicitly configured API clients/tests only.
    if "headers" in current_app.config["JWT_TOKEN_LOCATION"]:
        data["access_token"] = token
    response = jsonify(data)
    if "cookies" in current_app.config["JWT_TOKEN_LOCATION"]:
        set_access_cookies(response, token)
    return response
