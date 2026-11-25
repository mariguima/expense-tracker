import unittest

from app import create_app, db
from app.models.financial_settings import FinancialSettings


class FinancialSettingsFlowTest(unittest.TestCase):
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
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def signup_and_login(self, email, budget):
        signup = self.client.post("/signup", json={
            "first_name": "Test", "last_name": "Person", "email": email,
            "password": "test-password-12345",
            "financial_settings": {
                "monthly_budget": budget,
                "monthly_savings_goal": "125.50",
                "emergency_fund_target": "4000.00",
                "currency": "EUR",
            },
        })
        self.assertEqual(signup.status_code, 201, signup.json)
        login = self.client.post("/login", json={"email": email, "password": "test-password-12345"})
        self.assertEqual(login.status_code, 200, login.json)
        return login.json["access_token"]

    def test_signup_login_and_profile_update_are_per_user(self):
        first_token = self.signup_and_login("first@example.com", "1200.00")
        second_token = self.signup_and_login("second@example.com", "3000.00")
        first_headers = {"Authorization": f"Bearer {first_token}"}
        second_headers = {"Authorization": f"Bearer {second_token}"}

        before = self.client.get("/profile", headers=first_headers)
        self.assertEqual(before.json["financial_settings"]["monthly_budget"], "1200.00")
        self.assertEqual(before.json["financial_settings"]["currency"], "EUR")

        updated = self.client.patch("/profile", headers=first_headers, json={
            "first_name": "Changed", "last_name": "Person", "email": "first@example.com",
            "financial_settings": {
                "monthly_budget": "1500.00",
                "monthly_savings_goal": "200.00",
                "emergency_fund_target": "4500.00",
                "currency": "GBP",
            },
        })
        self.assertEqual(updated.status_code, 200, updated.json)
        self.assertEqual(updated.json["financial_settings"]["monthly_budget"], "1500.00")
        self.assertEqual(self.client.get("/profile", headers=second_headers).json["financial_settings"]["monthly_budget"], "3000.00")
        self.assertEqual(FinancialSettings.query.count(), 2)

        invalid = self.client.patch("/profile", headers=first_headers, json={
            "first_name": "Changed", "last_name": "Person", "email": "first@example.com",
            "financial_settings": {"monthly_budget": "-1"},
        })
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(self.client.get("/profile", headers=first_headers).json["financial_settings"]["monthly_budget"], "1500.00")

    def test_signup_without_money_settings_gets_defaults(self):
        signup = self.client.post("/signup", json={
            "first_name": "Default", "last_name": "Person",
            "email": "default@example.com", "password": "test-password-12345",
        })
        self.assertEqual(signup.status_code, 201, signup.json)
        self.assertEqual(signup.json["financial_settings"]["monthly_budget"], "2000.00")
        self.assertEqual(signup.json["financial_settings"]["emergency_fund"], "0.00")


if __name__ == "__main__":
    unittest.main()
