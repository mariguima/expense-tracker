"""Shared request protections. New application routes require authentication by default."""
import json
import traceback
from urllib.parse import urlsplit
from uuid import uuid4

from flask import g, jsonify, request
from flask_jwt_extended import verify_jwt_in_request
from flask_limiter import Limiter
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from app.utils.password_reset import rate_key


def client_key():
    # Never trust arbitrary X-Forwarded-For; ProxyFix is opt-in for a known proxy.
    return rate_key(f"ip:{request.remote_addr or 'unknown'}")


def login_key():
    data = request.get_json(silent=True)
    email = data.get("email", "") if isinstance(data, dict) else ""
    return rate_key(f"login:{email.strip().lower() if isinstance(email, str) else ''}")


limiter = Limiter(key_func=client_key)
PUBLIC_ENDPOINTS = frozenset({
    "auth.signup", "auth.login", "auth.request_password_reset",
    "auth.confirm_password_reset", "health",
})


def audit(event, user_id=None):
    from flask import current_app
    current_app.logger.info(json.dumps({
        "event": event, "user_id": user_id,
        "request_id": getattr(g, "request_id", None), "client": client_key(),
    }))


def init_security(app):
    production = app.config["APP_ENV"] == "production"
    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("Set SECRET_KEY in the backend environment.")
    if production:
        for key in ("SECRET_KEY", "JWT_SECRET_KEY"):
            if len(app.config.get(key) or "") < 32:
                raise RuntimeError(f"{key} must contain at least 32 random characters in production.")
        if not app.config["RATELIMIT_STORAGE_URI"].startswith(("redis://", "rediss://")):
            raise RuntimeError("Production rate limits require shared Redis storage.")
        if not app.config.get("RATELIMIT_ENABLED", True):
            raise RuntimeError("Production rate limits must be enabled.")
        if urlsplit(app.config["FRONTEND_URL"]).scheme != "https":
            raise RuntimeError("FRONTEND_URL must use HTTPS in production.")
        if not app.config["JWT_COOKIE_SECURE"] or not app.config["JWT_COOKIE_CSRF_PROTECT"] or app.config["JWT_TOKEN_LOCATION"] != ["cookies"]:
            raise RuntimeError("Production requires secure cookies with CSRF protection.")
        if app.debug:
            raise RuntimeError("Debug mode is forbidden in production.")

    proxy_count = app.config["TRUSTED_PROXY_COUNT"]
    if proxy_count:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=proxy_count, x_proto=proxy_count, x_host=0, x_port=0, x_prefix=0)

    @app.before_request
    def identify_request():
        g.request_id = uuid4().hex

    # Rate-limit rejected authentication attempts too, before doing JWT/DB work.
    limiter.init_app(app)

    @app.before_request
    def request_guards():
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("Origin")
            if request.headers.get("Sec-Fetch-Site") == "cross-site" or (origin and origin != app.config["FRONTEND_URL"].rstrip("/")):
                return jsonify(error="This request origin is not allowed."), 403
            if request.method != "DELETE" and not isinstance(request.get_json(), dict):
                return jsonify(error="Send a JSON object."), 400
        if request.endpoint and request.endpoint not in PUBLIC_ENDPOINTS and request.method != "OPTIONS":
            verify_jwt_in_request()

    @app.after_request
    def response_guards(response):
        response.headers.update({
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
            "X-Request-ID": getattr(g, "request_id", uuid4().hex),
        })
        if production and request.is_secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        if response.status_code in {401, 403, 429}:
            audit(f"request_rejected_{response.status_code}")
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {400: "Invalid request.", 404: "Not found.", 405: "Method not allowed.",
                    413: "Request is too large.", 415: "Send application/json.",
                    429: "Too many requests. Please try again later."}
        response = error.get_response()
        response.data = app.json.dumps({"error": messages.get(error.code, error.name)})
        response.content_type = "application/json"
        return response

    @app.errorhandler(Exception)
    def unexpected_error(error):
        from app import db
        db.session.rollback()
        # Exception text / SQL parameters can contain passwords or financial data.
        frames = traceback.extract_tb(error.__traceback__)
        app.logger.error("request_failed id=%s endpoint=%s type=%s frames=%s",
                         getattr(g, "request_id", ""), request.endpoint,
                         type(error).__name__, [(f.filename, f.lineno, f.name) for f in frames])
        return jsonify(error="Something went wrong. Please try again.", request_id=getattr(g, "request_id", None)), 500
