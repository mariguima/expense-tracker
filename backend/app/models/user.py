from app import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(255), nullable=False)
    last_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    token_version = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.Index("uq_users_email_normalized", db.func.lower(email), unique=True),)

    expense = db.relationship("Expense", backref="user", lazy=True)
    financial_settings = db.relationship(
        "FinancialSettings", backref="user", uselist=False,
        cascade="all, delete-orphan", lazy="joined",
    )

    def __repr__(self):
        return f"<User {self.id}>"
