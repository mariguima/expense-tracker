from marshmallow import Schema, fields, validate
from app.schemas.validation import NormalizedEmail, TrimmedString, money_range


class FinancialSettingsSchema(Schema):
    monthly_budget = fields.Decimal(as_string=True, validate=money_range(maximum="9999999999.99"))
    monthly_savings_goal = fields.Decimal(as_string=True, validate=money_range("0", "9999999999.99"))
    emergency_fund = fields.Decimal(as_string=True, validate=money_range("0", "9999999999.99"))
    emergency_fund_target = fields.Decimal(as_string=True, validate=money_range(maximum="9999999999.99"))
    currency = fields.Str(validate=validate.OneOf(["GBP", "EUR", "USD"]))
    warn_at_80 = fields.Bool()
    round_amounts = fields.Bool()

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    first_name = fields.Str(dump_only=True)
    last_name = fields.Str(dump_only=True)
    email = fields.Email(required=True)
    created_at = fields.DateTime(dump_only=True)

class UserCreateSchema(Schema):
    first_name = TrimmedString(required=True, validate=validate.Length(min=1, max=255))
    last_name = TrimmedString(required=True, validate=validate.Length(min=1, max=255))
    email = NormalizedEmail(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=15, max=128))
    financial_settings = fields.Nested(FinancialSettingsSchema)

class UserLoginSchema(Schema):
    email = NormalizedEmail(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=1, max=128))


class ProfileUpdateSchema(Schema):
    first_name = TrimmedString(required=True, validate=validate.Length(min=1, max=255))
    last_name = TrimmedString(required=True, validate=validate.Length(min=1, max=255))
    email = NormalizedEmail(required=True)
    current_password = fields.Str(load_only=True, validate=validate.Length(max=128))
    financial_settings = fields.Nested(FinancialSettingsSchema, required=True)
