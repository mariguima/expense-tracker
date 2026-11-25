from marshmallow import Schema, fields, validate
from datetime import date
from app.schemas.validation import TrimmedString, money_range

class ExpenseSchema(Schema):
    id = fields.Int(dump_only=True)
    amount = fields.Decimal(as_string=True)
    category = fields.Str()
    date = fields.Date()
    payment_type = fields.Str()
    number_of_installments = fields.Int()
    description = fields.Str(allow_none=True)

class ExpenseCreateSchema(Schema):
    amount = fields.Decimal(required=True, validate=money_range())
    category = TrimmedString(required=True, validate=validate.Length(max=50))
    date = fields.Date(required=True, validate=validate.Range(min=date(1900, 1, 1), max=date(9998, 12, 31)))
    payment_type = fields.Str(required=True, validate=validate.OneOf(["credit", "debit", "cash"]))
    number_of_installments = fields.Int(required=True, strict=True, validate=validate.Range(min=1, max=1200))
    description = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=255))

class ExpenseUpdateSchema(Schema):
    amount = fields.Decimal(validate=money_range())
    category = TrimmedString(validate=validate.Length(max=50))
    date = fields.Date(validate=validate.Range(min=date(1900, 1, 1), max=date(9998, 12, 31)))
    payment_type = fields.Str(validate=validate.OneOf(["credit", "debit", "cash"]))
    number_of_installments = fields.Int(strict=True, validate=validate.Range(min=1, max=1200))
    description = fields.Str(allow_none=True, validate=validate.Length(max=255))

