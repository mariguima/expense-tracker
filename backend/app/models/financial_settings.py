from app import db


class FinancialSettings(db.Model):
    __tablename__ = "financial_settings"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    monthly_budget = db.Column(db.Numeric(12, 2), nullable=False, default=2000)
    monthly_savings_goal = db.Column(db.Numeric(12, 2), nullable=False, default=225)
    emergency_fund = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    emergency_fund_target = db.Column(db.Numeric(12, 2), nullable=False, default=5000)
    currency = db.Column(db.String(3), nullable=False, default="GBP")
    warn_at_80 = db.Column(db.Boolean, nullable=False, default=True)
    round_amounts = db.Column(db.Boolean, nullable=False, default=False)
