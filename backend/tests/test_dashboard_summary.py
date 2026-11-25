import unittest
from datetime import date
from decimal import Decimal

from flask_jwt_extended import create_access_token

from app import create_app, db
from app.models.expense import Expense
from app.models.financial_settings import FinancialSettings
from app.models.user import User


class DashboardSummaryTest(unittest.TestCase):
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
        first = User(first_name="First", last_name="Person", email="first@example.com", password_hash="unused")
        second = User(first_name="Second", last_name="Person", email="second@example.com", password_hash="unused")
        first.financial_settings = FinancialSettings(monthly_budget=Decimal("100.00"))
        second.financial_settings = FinancialSettings(monthly_budget=Decimal("100.00"))
        db.session.add_all([first, second])
        db.session.flush()
        db.session.add_all([
            Expense(user_id=first.id, amount=Decimal("10.00"), category="Food & dining", date=date(2026, 11, 2), payment_type="debit", number_of_installments=1, description="Lunch"),
            Expense(user_id=first.id, amount=Decimal("90.00"), category="Shopping", date=date(2026, 10, 31), payment_type="credit", number_of_installments=3, description="Shoes"),
            Expense(user_id=first.id, amount=Decimal("20.00"), category="Bills", date=date(2026, 10, 3), payment_type="debit", number_of_installments=1, description="Bill"),
            Expense(user_id=second.id, amount=Decimal("500.00"), category="Home", date=date(2026, 11, 5), payment_type="debit", number_of_installments=1, description="Rent"),
        ])
        db.session.commit()
        self.headers = {"Authorization": f"Bearer {create_access_token(identity=str(first.id))}"}
        self.second_headers = {"Authorization": f"Bearer {create_access_token(identity=str(second.id))}"}
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def test_month_summary_includes_installments_and_excludes_other_users(self):
        response = self.client.get("/expenses/summary?month=11&year=2026", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.json)
        summary = response.json
        self.assertEqual(summary["total"], "40.00")
        self.assertEqual(summary["previous_month_total"], "50.00")
        self.assertEqual(summary["month_over_month_percentage"], "-20.00")
        self.assertEqual(summary["period_over_period_percentage"], "-20.00")
        self.assertEqual(summary["daily_expenses"], [
            {"date": "2026-11-02", "total": "10.00"},
            {"date": "2026-11-30", "total": "30.00"},
        ])
        self.assertEqual(summary["category_expenses"], [
            {"category": "Shopping", "total": "30.00"},
            {"category": "Food & dining", "total": "10.00"},
        ])

    def test_custom_range_and_validation(self):
        response = self.client.get("/expenses/summary?start=2026-11-01&end=2026-11-07", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["total"], "10.00")
        self.assertEqual(response.json["previous_period_total"], "30.00")
        self.assertEqual(response.json["period_over_period_percentage"], "-66.67")
        self.assertEqual(self.client.get("/expenses/summary?start=bad&end=2026-11-07", headers=self.headers).status_code, 400)
        self.assertEqual(self.client.get("/expenses/summary?start=2026-11-07&end=2026-11-01", headers=self.headers).status_code, 400)
        self.assertEqual(self.client.get("/expenses/summary?month=11&year=2026").status_code, 401)

    def test_empty_period_has_zero_totals_and_no_categories(self):
        response = self.client.get("/expenses/summary?month=1&year=2025", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["total"], "0.00")
        self.assertEqual(response.json["daily_expenses"], [])
        self.assertEqual(response.json["category_expenses"], [])
        self.assertIsNone(response.json["month_over_month_percentage"])

    def test_cumulative_savings_through_selected_period(self):
        october = self.client.get("/savings/summary?end=2026-10-31", headers=self.headers)
        november = self.client.get("/savings/summary?end=2026-11-30", headers=self.headers)
        self.assertEqual(october.status_code, 200, october.json)
        self.assertEqual(november.status_code, 200, november.json)
        self.assertEqual(october.json["cumulative_savings"], "50.00")
        self.assertEqual(november.json["cumulative_savings"], "110.00")
        self.assertEqual([month["saved"] for month in november.json["monthly_savings"]], ["50.00", "60.00"])
        partial = self.client.get("/savings/summary?end=2026-11-15", headers=self.headers)
        self.assertEqual(partial.json["cumulative_savings"], "90.00")
        overspent = self.client.get("/savings/summary?end=2026-11-30", headers=self.second_headers)
        self.assertEqual(overspent.json["cumulative_savings"], "0.00")
        self.assertEqual(self.client.get("/savings/summary?end=bad", headers=self.headers).status_code, 400)
        self.assertEqual(self.client.get("/savings/summary?end=2026-11-30").status_code, 401)


if __name__ == "__main__":
    unittest.main()
