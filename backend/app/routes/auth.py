from datetime import datetime, timedelta, timezone
import re
import secrets

from flask import Blueprint, current_app, request, jsonify
from app import db, bcrypt
from app.models.user import User
from app.models.financial_settings import FinancialSettings
from app.models.password_reset import PasswordResetRequest, PasswordResetToken
from flask_jwt_extended import get_jwt_identity, jwt_required, unset_jwt_cookies
from marshmallow import ValidationError
from app.schemas.user_schema import FinancialSettingsSchema, UserCreateSchema, UserLoginSchema, UserSchema
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from app.utils.password_reset import dispatch_password_changed_email, dispatch_reset_email, hash_token, rate_key, missing_email_settings
from app.utils.auth import password_matches, session_response
from app.security import audit, limiter, login_key

auth_bp = Blueprint("auth", __name__)
user_schema = UserSchema()
user_create_schema = UserCreateSchema()
user_login_schema = UserLoginSchema()
settings_schema = FinancialSettingsSchema()


# create user in signup page
@auth_bp.route("/signup", methods=["POST"])
@limiter.limit("5 per hour", override_defaults=False)
def signup():
    try:
        data = user_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    email = data["email"]
    password = data["password"]
    if len(password.encode("utf-8")) > 72:
        return jsonify({"errors": {"password": ["Password is too long for the password hasher."]}}), 400
    first_name = data["first_name"].strip()
    last_name = data["last_name"].strip()
    if not first_name or not last_name:
        return jsonify({"errors": {
            "first_name": ["First name cannot be blank."],
            "last_name": ["Last name cannot be blank."],
        }}), 400

    existing_user = db.session.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()
    if existing_user is not None:
        return jsonify({"error": "An account with this email already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(first_name=first_name, last_name=last_name, email=email, password_hash=hashed_password)
    new_user.financial_settings = FinancialSettings(**data.get("financial_settings", {}))

    db.session.add(new_user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Unable to create an account with these details."}), 409
    audit("signup_success", new_user.id)

    return jsonify({
          "message": "User created successfully",
          "user": user_schema.dump(new_user),
          "financial_settings": settings_schema.dump(new_user.financial_settings),
      }), 201


# login of user
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20 per minute", override_defaults=False)
@limiter.limit("5 per minute", key_func=login_key, override_defaults=False)
def login():
    try:
        data = user_login_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    email = data["email"]
    password = data["password"]

    user = db.session.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()

    if not password_matches(user, password):
        audit("login_failed")
        return jsonify({"error": "Invalid email or password"}), 401

    audit("login_success", user.id)
    return session_response(user), 200


@auth_bp.post("/logout")
@jwt_required()
def logout():
    user = db.session.get(User, int(get_jwt_identity()))
    # Revoke every issued session, including any copied cookie.
    db.session.execute(update(User).where(User.id == user.id).values(token_version=User.token_version + 1))
    db.session.commit()
    audit("logout_all_sessions", user.id)
    response = jsonify(message="Signed out on all devices.")
    unset_jwt_cookies(response)
    return response


RESET_MESSAGE = "If an account exists for that email, we have sent a password reset link."
INVALID_RESET_MESSAGE = "This reset link is invalid or has expired. Request a new one."


@auth_bp.route("/password-reset/request", methods=["POST"])
@limiter.limit("20 per hour", override_defaults=False)
def request_password_reset():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "Enter a valid email address."}), 400
    email = data.get("email")
    if not isinstance(email, str) or len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip()):
        return jsonify({"error": "Enter a valid email address."}), 400
    email = email.strip().lower()
    config = current_app.config
    missing = missing_email_settings(config)
    if missing:
        current_app.logger.error("Password reset email configuration missing: %s", ", ".join(missing))
        return jsonify({"error": "Password reset email is temporarily unavailable. Please try again later."}), 503

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = now - timedelta(hours=1)
    email_key = rate_key(f"email:{email}")
    ip_key = rate_key(f"ip:{request.remote_addr or 'unknown'}")
    email_count = db.session.scalar(select(func.count()).select_from(PasswordResetRequest).where(
        PasswordResetRequest.email_key == email_key, PasswordResetRequest.created_at >= cutoff,
    ))
    ip_count = db.session.scalar(select(func.count()).select_from(PasswordResetRequest).where(
        PasswordResetRequest.ip_key == ip_key, PasswordResetRequest.created_at >= cutoff,
    ))
    if email_count >= 5 or ip_count >= 20:
        return jsonify({"error": "Too many requests. Please try again later."}), 429
    db.session.add(PasswordResetRequest(email_key=email_key, ip_key=ip_key, created_at=now))

    user = db.session.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()
    token = secrets.token_urlsafe(32)
    if user is not None:
        db.session.add(PasswordResetToken(
            user_id=user.id, token_hash=hash_token(token), created_at=now,
            expires_at=now + timedelta(minutes=30),
        ))
    db.session.commit()
    # Queue capacity behaves the same for known and unknown accounts. Unknown accounts
    # enqueue a no-op, never an email, so errors cannot reveal account existence.
    if not dispatch_reset_email(user.email if user else None, token):
        return jsonify({"error": "Password reset email is busy. Please try again later."}), 503
    response = jsonify({"message": RESET_MESSAGE})
    response.headers["Cache-Control"] = "no-store"
    return response, 202


@auth_bp.route("/password-reset/confirm", methods=["POST"])
@limiter.limit("30 per hour", override_defaults=False)
def confirm_password_reset():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": INVALID_RESET_MESSAGE}), 400
    token = data.get("token")
    email = data.get("email")
    password = data.get("password")
    if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        return jsonify({"error": INVALID_RESET_MESSAGE}), 400
    if not isinstance(password, str) or not 15 <= len(password) <= 128 or len(password.encode("utf-8")) > 72:
        return jsonify({"error": "Use at least 15 characters and no more than 72 UTF-8 bytes."}), 400
    if not isinstance(email, str) or len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip()):
        return jsonify({"error": "Enter a valid email address."}), 400

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    ip_key = rate_key(f"confirm-ip:{request.remote_addr or 'unknown'}")
    cutoff = now - timedelta(hours=1)
    attempts = db.session.scalar(select(func.count()).select_from(PasswordResetRequest).where(
        PasswordResetRequest.ip_key == ip_key, PasswordResetRequest.created_at >= cutoff,
    ))
    if attempts >= 30:
        return jsonify({"error": "Too many requests. Please try again later."}), 429
    db.session.add(PasswordResetRequest(email_key=rate_key("confirm"), ip_key=ip_key, created_at=now))

    reset_token = db.session.execute(select(PasswordResetToken).where(
        PasswordResetToken.token_hash == hash_token(token),
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    )).scalar_one_or_none()
    if reset_token is None or reset_token.user_id is None:
        db.session.commit()
        return jsonify({"error": INVALID_RESET_MESSAGE}), 400

    user = db.session.get(User, reset_token.user_id)
    if user is None or user.email.lower() != email.strip().lower():
        db.session.commit()
        return jsonify({"error": INVALID_RESET_MESSAGE}), 400

    claimed = db.session.execute(update(PasswordResetToken).where(
        PasswordResetToken.id == reset_token.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).values(used_at=now))
    if claimed.rowcount != 1:
        db.session.commit()
        return jsonify({"error": INVALID_RESET_MESSAGE}), 400

    user.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    db.session.execute(update(User).where(User.id == user.id).values(token_version=User.token_version + 1))
    db.session.execute(update(PasswordResetToken).where(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).values(used_at=now))
    db.session.commit()
    audit("password_reset_success", user.id)
    dispatch_password_changed_email(user.email)
    response = jsonify({"message": "Password updated. You can now sign in."})
    unset_jwt_cookies(response)
    response.headers["Cache-Control"] = "no-store"
    return response, 200
