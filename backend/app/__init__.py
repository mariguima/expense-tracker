from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
import secrets
from flask import Flask, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from app.config import Config

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
jwt = JWTManager()

def create_app(config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)
    
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    app.logger.setLevel(logging.INFO)
    app.config["DUMMY_PASSWORD_HASH"] = bcrypt.generate_password_hash(secrets.token_urlsafe(24)).decode("utf-8")

    from app.security import init_security
    init_security(app)

    # models
    from app.models import user, expense, financial_settings, password_reset

    @jwt.additional_claims_loader
    def account_token_version(identity):
        account = db.session.get(user.User, int(identity))
        return {"token_version": account.token_version if account else -1}

    @jwt.token_in_blocklist_loader
    def revoked_after_password_reset(_header, payload):
        try:
            identity = int(payload["sub"])
        except (ValueError, TypeError, KeyError):
            return True
        if identity <= 0 or identity > 2147483647:
            return True
        account = db.session.get(user.User, identity)
        return account is None or payload.get("token_version") != account.token_version

    @jwt.unauthorized_loader
    @jwt.invalid_token_loader
    def invalid_session(_reason):
        return jsonify(error="Please sign in again."), 401

    @jwt.expired_token_loader
    @jwt.revoked_token_loader
    def expired_session(_header, _payload):
        return jsonify(error="Please sign in again."), 401
    
    #routes
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from app.routes.expense import expense_bp
    app.register_blueprint(expense_bp)

    from app.routes.profile import profile_bp
    app.register_blueprint(profile_bp)

    from app.routes.savings import savings_bp
    app.register_blueprint(savings_bp)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    from app.commands import register_commands
    register_commands(app)

    return app
