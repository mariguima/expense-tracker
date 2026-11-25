import logging
import time
import unittest
from datetime import timedelta

from flask_jwt_extended import create_access_token

from app import create_app, db
from app.security import limiter


class SecurityTest(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True, "APP_ENV": "development",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "isolated-test-secret-at-least-32-characters",
            "JWT_SECRET_KEY": "isolated-jwt-secret-at-least-32-characters",
            "JWT_TOKEN_LOCATION": ["cookies"], "JWT_COOKIE_SECURE": False,
            "JWT_COOKIE_CSRF_PROTECT": True, "BCRYPT_LOG_ROUNDS": 4,
            "RATELIMIT_ENABLED": True, "RATELIMIT_STORAGE_URI": "memory://",
            "FRONTEND_URL": "http://localhost:5173",
        })
        self.app.logger.setLevel(logging.CRITICAL)
        @self.app.get("/future-private-route")
        def future_private_route():
            return {"protected": True}
        @self.app.get("/failure")
        def failure():
            raise RuntimeError("private-password-and-database-details")
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        limiter.reset()
        self.client = self.app.test_client()
        self.password = "a-long-test-password-123"
        self.create_user(self.client, "first@example.com")

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def create_user(self, client, email):
        result = client.post("/signup", json={
            "first_name": "Test", "last_name": "Person", "email": email, "password": self.password,
        })
        self.assertEqual(result.status_code, 201, result.json)

    def login(self, client=None, email="first@example.com", **extra):
        client = client or self.client
        return client.post("/login", json={"email": email, "password": self.password, **extra})

    def headers(self, client=None):
        cookie = (client or self.client).get_cookie("csrf_access_token")
        return {"X-CSRF-TOKEN": cookie.value} if cookie else {}

    def mutate(self, path, payload, client=None, method="post"):
        client = client or self.client
        return getattr(client, method)(path, json=payload, headers=self.headers(client))

    def expense(self):
        return {"amount": "12.50", "category": "Food", "date": "2026-11-01", "payment_type": "debit", "number_of_installments": 1}

    def test_cookie_session_csrf_and_logout_revocation(self):
        result = self.login()
        self.assertEqual(result.status_code, 200)
        self.assertNotIn("access_token", result.json)
        cookie = self.client.get_cookie("access_token_cookie")
        self.assertTrue(cookie.http_only)
        self.assertEqual(cookie.same_site, "Lax")
        self.assertEqual(self.client.get("/profile").status_code, 200)
        self.assertEqual(self.client.post("/expenses", json=self.expense()).status_code, 401)
        self.assertEqual(self.mutate("/expenses", self.expense()).status_code, 201)
        copied = self.app.test_client()
        copied.set_cookie("access_token_cookie", cookie.value)
        self.assertEqual(self.mutate("/logout", {}).status_code, 200)
        self.assertIsNone(self.client.get_cookie("access_token_cookie"))
        self.assertEqual(copied.get("/profile").status_code, 401)

    def test_secure_cookie_flag_and_expired_or_malformed_session(self):
        self.app.config["JWT_COOKIE_SECURE"] = True
        self.assertIn("Secure", self.login().headers.getlist("Set-Cookie")[0])
        self.app.config["JWT_COOKIE_SECURE"] = False
        for token in (create_access_token(identity="1", expires_delta=timedelta(seconds=-1)), "broken-token"):
            self.client.set_cookie("access_token_cookie", token)
            self.assertEqual(self.client.get("/profile").status_code, 401)
        # A correctly signed token with a non-numeric subject must not become a 500.
        import jwt
        token = jwt.encode({"sub": "invalid", "type": "access", "exp": int(time.time()) + 60, "jti": "test", "token_version": 0}, self.app.config["JWT_SECRET_KEY"], algorithm="HS256")
        self.client.set_cookie("access_token_cookie", token)
        self.assertEqual(self.client.get("/profile").status_code, 401)

    def test_default_deny_auth_and_foreign_origins(self):
        for route in ("/profile", "/expenses", "/savings/summary?end=2026-11-01", "/future-private-route"):
            self.assertEqual(self.client.get(route).status_code, 401, route)
        self.assertEqual(self.client.get("/missing").status_code, 404)
        for headers in ({"Origin": "https://attacker.example"}, {"Origin": "null"}, {"Sec-Fetch-Site": "cross-site"}):
            result = self.client.post("/login", json={"email": "first@example.com", "password": self.password}, headers=headers)
            self.assertEqual(result.status_code, 403)
        self.assertEqual(self.login().status_code, 200)
        self.assertEqual(self.client.get("/future-private-route").status_code, 200)

    def test_owner_isolation_and_user_id_injection(self):
        self.login()
        item_id = self.mutate("/expenses", self.expense()).json["expense_id"]
        other = self.app.test_client()
        self.create_user(other, "second@example.com")
        self.login(other, "second@example.com")
        self.assertEqual(other.get("/expenses").json, [])
        self.assertEqual(self.mutate(f"/expenses/{item_id}", {"amount": "1.00"}, other, "patch").status_code, 404)
        self.assertEqual(other.delete(f"/expenses/{item_id}", headers=self.headers(other)).status_code, 404)
        self.assertEqual(self.mutate("/expenses", {**self.expense(), "user_id": 1}, other).status_code, 400)
        self.assertEqual(len(self.client.get("/expenses").json), 1)

    def test_validation_rejects_oversized_and_malformed_input(self):
        self.login()
        for field, value in (("amount", "NaN"), ("amount", "Infinity"), ("amount", "1e99999"), ("amount", "12.001"), ("amount", "100000000"), ("category", "x" * 51), ("category", "  "), ("description", "x" * 256), ("number_of_installments", 1.5), ("number_of_installments", 1000000)):
            result = self.mutate("/expenses", {**self.expense(), field: value})
            self.assertEqual(result.status_code, 400, (field, value, result.json))
        self.assertEqual(self.client.post("/login", json=[]).status_code, 400)
        self.assertEqual(self.client.post("/login", data="{}", content_type="text/plain").status_code, 415)
        self.assertEqual(self.client.post("/login", json={"padding": "x" * 33000}).status_code, 413)
        self.assertEqual(self.client.get("/expenses").json, [])

    def test_login_is_rate_limited_across_ip_addresses(self):
        for number in range(5):
            result = self.client.post("/login", json={"email": "missing@example.com", "password": self.password}, environ_overrides={"REMOTE_ADDR": f"192.0.2.{number}"})
            self.assertEqual(result.status_code, 401)
        limited = self.client.post("/login", json={"email": "missing@example.com", "password": self.password}, environ_overrides={"REMOTE_ADDR": "192.0.2.99"})
        self.assertEqual(limited.status_code, 429)
        self.assertIn("Retry-After", limited.headers)

    def test_email_normalization_and_reauthentication(self):
        self.assertEqual(self.login(email=" FIRST@EXAMPLE.COM ").status_code, 200)
        duplicate = self.client.post("/signup", json={"first_name": "Test", "last_name": "Person", "email": "FIRST@example.com", "password": self.password})
        self.assertEqual(duplicate.status_code, 409)
        payload = {"first_name": "Test", "last_name": "Person", "email": "new@example.com", "financial_settings": {}}
        self.assertEqual(self.mutate("/profile", payload, method="patch").status_code, 403)
        self.assertEqual(self.mutate("/profile", {**payload, "current_password": self.password}, method="patch").status_code, 200)
        self.assertEqual(self.client.get("/profile").json["user"]["email"], "new@example.com")

    def test_password_only_login_and_removed_two_factor_routes(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("mfa_required", response.json)
        self.assertNotIn("mfa_enabled", response.json["user"])
        for path in ("/mfa/setup", "/mfa/enable", "/mfa/disable"):
            self.assertEqual(self.mutate(path, {}).status_code, 404)

    def test_headers_and_errors_hide_sensitive_details(self):
        self.login()
        response = self.client.get("/failure")
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("private-password", response.get_data(as_text=True))
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy"])
        self.assertEqual(len(response.json["request_id"]), 32)

    def test_production_rejects_insecure_configuration(self):
        baseline = {
            "TESTING": True, "APP_ENV": "production", "BCRYPT_LOG_ROUNDS": 4,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "strong-test-secret-at-least-32-characters",
            "JWT_SECRET_KEY": "separate-test-secret-at-least-32-characters",
            "FRONTEND_URL": "https://expenses.example.com",
            "JWT_COOKIE_SECURE": True, "JWT_COOKIE_CSRF_PROTECT": True,
            "RATELIMIT_STORAGE_URI": "rediss://redis.example.com:6379/0",
        }
        for invalid in ({"SECRET_KEY": "weak"}, {"JWT_COOKIE_SECURE": False},
                        {"JWT_COOKIE_CSRF_PROTECT": False}, {"JWT_TOKEN_LOCATION": ["headers"]},
                        {"RATELIMIT_STORAGE_URI": "memory://"},
                        {"RATELIMIT_ENABLED": False}, {"FRONTEND_URL": "http://expenses.example.com"},
                        {"DEBUG": True}):
            with self.subTest(config=invalid), self.assertRaises(RuntimeError):
                create_app({**baseline, **invalid})


if __name__ == "__main__":
    unittest.main()
