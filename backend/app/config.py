import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    APP_ENV = os.environ.get("APP_ENV", "development")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or SECRET_KEY
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_COOKIE_SECURE = APP_ENV == "production"
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_SESSION_COOKIE = True
    MAX_CONTENT_LENGTH = 32 * 1024
    SQLALCHEMY_ENGINE_OPTIONS = {"hide_parameters": True, "pool_pre_ping": True}
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT = "120 per minute; 1000 per hour"
    RATELIMIT_HEADERS_ENABLED = True
    TRUSTED_PROXY_COUNT = int(os.environ.get("TRUSTED_PROXY_COUNT", "0"))
    TRUSTED_HOSTS = [host.strip() for host in os.environ.get("TRUSTED_HOSTS", "localhost,127.0.0.1,[::1]").split(",") if host.strip()]
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "").strip()
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    SMTP_FROM = os.environ.get("SMTP_FROM") or SMTP_USERNAME
    SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "false").lower() == "true"
