import unittest
import smtplib
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app import create_app, db
from app.models.password_reset import PasswordResetToken
from app.utils.password_reset import hash_token, send_reset_email, missing_email_settings


class PasswordResetFlowTest(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "APP_ENV": "development",
            "SECRET_KEY": "test-secret-at-least-thirty-two-characters-long",
            "JWT_TOKEN_LOCATION": ["headers"],
            "RATELIMIT_ENABLED": False,
            "BCRYPT_LOG_ROUNDS": 4,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "test-secret-at-least-thirty-two-characters-long",
            "SMTP_HOST": "smtp.example.com",
            "SMTP_FROM": "security@example.com",
            "SMTP_USERNAME": "sender@example.com",
            "SMTP_PASSWORD": "test-app-password",
            "SMTP_USE_SSL": False,
            "SMTP_PORT": 587,
            "FRONTEND_URL": "http://localhost:5173",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.email_patch = patch("app.routes.auth.dispatch_reset_email")
        self.changed_patch = patch("app.routes.auth.dispatch_password_changed_email")
        self.send_reset = self.email_patch.start()
        self.send_changed = self.changed_patch.start()
        response = self.client.post("/signup", json={
            "first_name": "Test", "last_name": "Person",
            "email": "test@example.com", "password": "original-password-123",
        })
        self.assertEqual(response.status_code, 201, response.json)

    def tearDown(self):
        self.email_patch.stop()
        self.changed_patch.stop()
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def request_token(self):
        response = self.client.post("/password-reset/request", json={"email": "test@example.com"})
        self.assertEqual(response.status_code, 202, response.json)
        return self.send_reset.call_args.args[1]

    def test_reset_is_single_use_and_revokes_existing_access(self):
        old_login = self.client.post("/login", json={"email": "test@example.com", "password": "original-password-123"})
        self.assertEqual(old_login.status_code, 200)
        old_headers = {"Authorization": f"Bearer {old_login.json['access_token']}"}
        token = self.request_token()
        stored = PasswordResetToken.query.one()
        self.assertNotEqual(stored.token_hash, token)
        self.assertEqual(self.client.get("/profile", headers=old_headers).status_code, 200)

        reset = self.client.post("/password-reset/confirm", json={"token": token, "email": "test@example.com", "password": "new-secure-password-123"})
        self.assertEqual(reset.status_code, 200, reset.json)
        self.assertEqual(self.send_changed.call_args.args[0], "test@example.com")
        self.assertEqual(self.client.get("/profile", headers=old_headers).status_code, 401)
        self.assertEqual(self.client.post("/login", json={"email": "test@example.com", "password": "original-password-123"}).status_code, 401)
        self.assertEqual(self.client.post("/login", json={"email": "test@example.com", "password": "new-secure-password-123"}).status_code, 200)
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": token, "email": "test@example.com", "password": "another-secure-password-123"}).status_code, 400)

    def test_unknown_address_has_same_response_and_no_email(self):
        known = self.client.post("/password-reset/request", json={"email": "test@example.com"})
        unknown = self.client.post("/password-reset/request", json={"email": "missing@example.com"})
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.json, unknown.json)
        self.assertEqual(known.headers["Cache-Control"], "no-store")
        self.assertEqual(self.send_reset.call_count, 2)
        self.assertEqual(self.send_reset.call_args.args[0], None)

    def test_expired_token_and_other_links_are_rejected(self):
        first = self.request_token()
        second = self.request_token()
        PasswordResetToken.query.filter_by(token_hash=hash_token(first)).update({"expires_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)})
        db.session.commit()
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": first, "email": "test@example.com", "password": "new-secure-password-123"}).status_code, 400)
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": second, "email": "test@example.com", "password": "new-secure-password-123"}).status_code, 200)
        self.assertTrue(all(item.used_at for item in PasswordResetToken.query.all()))

    def test_request_rate_limit_applies_to_unknown_addresses(self):
        for _ in range(5):
            self.assertEqual(self.client.post("/password-reset/request", json={"email": "missing@example.com"}).status_code, 202)
        self.assertEqual(self.client.post("/password-reset/request", json={"email": "missing@example.com"}).status_code, 429)

    def test_short_password_is_rejected_without_using_token(self):
        token = self.request_token()
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": token, "email": "test@example.com", "password": "short"}).status_code, 400)
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": token, "email": "test@example.com", "password": "new-secure-password-123"}).status_code, 200)

    def test_email_must_match_token_account(self):
        token = self.request_token()
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": token, "email": "someone@example.com", "password": "new-secure-password-123"}).status_code, 400)
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": token, "email": "TEST@example.com", "password": "new-secure-password-123"}).status_code, 200)

    def test_signup_uses_same_password_policy(self):
        response = self.client.post("/signup", json={
            "first_name": "Other", "last_name": "Person",
            "email": "other@example.com", "password": "too-short",
        })
        self.assertEqual(response.status_code, 400)
        oversized = self.client.post("/signup", json={
            "first_name": "Other", "last_name": "Person",
            "email": "other@example.com", "password": "é" * 40,
        })
        self.assertEqual(oversized.status_code, 400)

    def test_malformed_json_is_rejected(self):
        self.assertEqual(self.client.post("/password-reset/request", json=["test@example.com"]).status_code, 400)
        self.assertEqual(self.client.post("/password-reset/confirm", json=["bad-token"]).status_code, 400)

    def test_reset_email_uses_configured_frontend_link(self):
        with patch("app.utils.password_reset.smtplib.SMTP") as smtp:
            send_reset_email("test@example.com", "sample-token")
            message = smtp.return_value.__enter__.return_value.send_message.call_args.args[0]
            self.assertIn("http://localhost:5173/reset-password?token=sample-token", message.get_body(preferencelist=("plain",)).get_content())
            self.assertIn("Reset password</a>", message.get_body(preferencelist=("html",)).get_content())
            smtp.return_value.__enter__.return_value.starttls.assert_called_once()

    def test_gmail_uses_login_address_as_sender_and_app_password_without_spaces(self):
        self.app.config.update(SMTP_HOST="smtp.gmail.com", SMTP_FROM="", SMTP_USERNAME="sender@gmail.com", SMTP_PASSWORD="abcd efgh ijkl mnop")
        self.assertEqual(missing_email_settings(self.app.config), [])
        with patch("app.utils.password_reset.smtplib.SMTP") as smtp:
            send_reset_email("test@example.com", "sample-token")
            connection = smtp.return_value.__enter__.return_value
            connection.login.assert_called_once_with("sender@gmail.com", "abcdefghijklmnop")
            message = connection.send_message.call_args.args[0]
            self.assertEqual(message["From"], "sender@gmail.com")
            self.assertIsNotNone(connection.starttls.call_args.kwargs["context"])

    def test_missing_gmail_credentials_do_not_claim_a_link_was_sent(self):
        self.app.config.update(SMTP_HOST="smtp.gmail.com", SMTP_PASSWORD="")
        response = self.client.post("/password-reset/request", json={"email": "test@example.com"})
        self.assertEqual(response.status_code, 503)
        self.send_reset.assert_not_called()
        self.assertEqual(PasswordResetToken.query.count(), 0)
        self.app.config.update(SMTP_USERNAME="", SMTP_FROM="")
        self.assertEqual(missing_email_settings(self.app.config), ["SMTP_USERNAME", "SMTP_PASSWORD"])

    def test_full_email_queue_has_identical_errors_for_known_and_unknown_accounts(self):
        self.send_reset.return_value = False
        known = self.client.post("/password-reset/request", json={"email": "test@example.com"})
        unknown = self.client.post("/password-reset/request", json={"email": "missing@example.com"})
        self.assertEqual(known.status_code, 503)
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.json, unknown.json)

    def test_email_check_verifies_login_without_sending_mail(self):
        with patch("app.utils.password_reset.smtplib.SMTP") as smtp:
            connection = smtp.return_value.__enter__.return_value
            connection.noop.return_value = (250, b"OK")
            result = self.app.test_cli_runner().invoke(args=["check-email"])
            self.assertEqual(result.exit_code, 0, result.output)
            connection.login.assert_called_once()
            connection.send_message.assert_not_called()
            self.assertNotIn(self.app.config["SMTP_PASSWORD"], result.output)

    def test_email_check_authentication_failure_is_actionable_without_leaking_secret(self):
        with patch("app.utils.password_reset.smtplib.SMTP") as smtp:
            smtp.return_value.__enter__.return_value.login.side_effect = smtplib.SMTPAuthenticationError(535, b"private-server-details")
            result = self.app.test_cli_runner().invoke(args=["check-email"])
            self.assertEqual(result.exit_code, 1)
            self.assertIn("Google app password", result.output)
            self.assertNotIn("private-server-details", result.output)

    def test_reset_email_token_completes_entire_flow(self):
        # Exercise the actual mail composition and TLS/authentication path. Only the
        # external SMTP connection is replaced, so this test never sends real mail.
        old_login = self.client.post("/login", json={"email": "test@example.com", "password": "original-password-123"})
        old_headers = {"Authorization": f"Bearer {old_login.json['access_token']}"}
        self.send_reset.side_effect = lambda address, token: send_reset_email(address, token) or True
        with patch("app.utils.password_reset.smtplib.SMTP") as smtp:
            requested = self.client.post("/password-reset/request", json={"email": "test@example.com"})
            self.assertEqual(requested.status_code, 202)
            message = smtp.return_value.__enter__.return_value.send_message.call_args.args[0]
            from urllib.parse import parse_qs, urlsplit
            link = next(line for line in message.get_body(preferencelist=("plain",)).get_content().splitlines() if "reset-password?" in line).split(" ")[-1]
            token = parse_qs(urlsplit(link).query)["token"][0]
        changed = self.client.post("/password-reset/confirm", json={"token": token, "email": "test@example.com", "password": "a-new-test-password-123"})
        self.assertEqual(changed.status_code, 200, changed.json)
        self.assertEqual(self.client.get("/profile", headers=old_headers).status_code, 401)
        self.assertEqual(self.client.post("/login", json={"email": "test@example.com", "password": "a-new-test-password-123"}).status_code, 200)
        self.assertEqual(self.client.post("/password-reset/confirm", json={"token": token, "email": "test@example.com", "password": "another-new-password-123"}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
