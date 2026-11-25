import hashlib
import hmac
import smtplib
import ssl
from contextlib import contextmanager
from html import escape
from threading import BoundedSemaphore
from concurrent.futures import ThreadPoolExecutor
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from urllib.parse import urlencode

from flask import current_app


mail_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="password-reset-mail")
mail_slots = BoundedSemaphore(20)


def _deliver(app, sender, address, token=None):
    with app.app_context():
        try:
            if address is None:
                return
            if token is None:
                sender(address)
            else:
                sender(address, token)
        except smtplib.SMTPAuthenticationError:
            app.logger.error("Account email authentication failed: check SMTP_USERNAME and SMTP_PASSWORD (use a Gmail app password).")
        except (OSError, smtplib.SMTPException):
            app.logger.error("Account security email delivery failed")
        finally:
            mail_slots.release()


def _dispatch(sender, address, token=None):
    app = current_app._get_current_object()
    if not mail_slots.acquire(blocking=False):
        app.logger.error("Account security email queue is full")
        return False
    try:
        mail_executor.submit(_deliver, app, sender, address, token)
        return True
    except RuntimeError:
        mail_slots.release()
        app.logger.error("Account security email queue unavailable")
        return False


def dispatch_reset_email(address, token):
    return _dispatch(send_reset_email, address, token)


def dispatch_password_changed_email(address):
    return _dispatch(send_password_changed_email, address)


def missing_email_settings(config):
    required = ["SMTP_HOST", "FRONTEND_URL"]
    if config.get("SMTP_HOST", "").lower() == "smtp.gmail.com" or config.get("SMTP_USERNAME"):
        required.extend(["SMTP_USERNAME", "SMTP_PASSWORD"])
    elif not config.get("SMTP_FROM"):
        required.append("SMTP_FROM")
    return [name for name in required if not config.get(name)]


@contextmanager
def mail_connection(config):
    """Always authenticate over certificate-verified TLS; no plaintext fallback."""
    smtp_class = smtplib.SMTP_SSL if config["SMTP_USE_SSL"] else smtplib.SMTP
    tls_options = {"context": ssl.create_default_context()} if config["SMTP_USE_SSL"] else {}
    with smtp_class(config["SMTP_HOST"], config["SMTP_PORT"], timeout=10, **tls_options) as smtp:
        smtp.ehlo()
        if not config["SMTP_USE_SSL"]:
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        if config["SMTP_USERNAME"]:
            password = config["SMTP_PASSWORD"] or ""
            if config["SMTP_HOST"].lower() == "smtp.gmail.com":
                # Google displays app passwords in space-separated groups.
                password = password.replace(" ", "")
            smtp.login(config["SMTP_USERNAME"], password)
        yield smtp


def _message(address, subject):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config.get("SMTP_FROM") or current_app.config["SMTP_USERNAME"]
    message["To"] = address
    message["Date"] = formatdate(localtime=False)
    message["Message-ID"] = make_msgid()
    return message


def hash_token(token):
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def rate_key(value):
    secret = current_app.config["SECRET_KEY"] or current_app.config["JWT_SECRET_KEY"]
    return hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def send_reset_email(address, token):
    config = current_app.config
    link = f'{config["FRONTEND_URL"].rstrip("/")}/reset-password?{urlencode({"token": token})}'
    message = _message(address, "Reset your Expense Tracker password")
    message.set_content(
        "We received a request to reset your Expense Tracker password.\n\n"
        f"Use this link within 30 minutes: {link}\n\n"
        "If you did not request this, you can ignore this email."
    )
    message.add_alternative(
        '<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#292326">'
        '<h1 style="font-size:24px">Reset your password</h1>'
        '<p>Use the link below to choose a new Expense Tracker password. '
        'It expires in 30 minutes and can only be used once.</p>'
        f'<p><a href="{escape(link, quote=True)}" style="display:inline-block;padding:12px 20px;'
        'background:#c83e56;color:white;border-radius:8px;text-decoration:none">Reset password</a></p>'
        '<p>If you did not request this, you can ignore this email.</p>'
        '</body></html>', subtype="html",
    )
    with mail_connection(config) as smtp:
        smtp.send_message(message)


def send_password_changed_email(address):
    config = current_app.config
    message = _message(address, "Your Expense Tracker password changed")
    message.set_content(
        "Your Expense Tracker password was changed. If this was not you, "
        "contact the service administrator immediately."
    )
    with mail_connection(config) as smtp:
        smtp.send_message(message)
