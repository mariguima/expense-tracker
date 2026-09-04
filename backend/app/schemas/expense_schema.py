from marshmallow import Schema, fields, validate

class ExpenseSchema(Schema):
    id = fields.Int(dump_only=True)
    amount = fields.Decimal(as_string=True)
    category = fields.Str()
    date = fields.Date()
    payment_type = fields.Str()
    number_of_installments = fields.Int()
    description = fields.Str(allow_none=True)

class ExpenseCreateSchema(Schema):
    amount = fields.Decimal(required=True, validate=validate.Range(min=0.01))
    category = fields.Str(required=True)
    date = fields.Date(required=True)
    payment_type = fields.Str(required=True, validate=validate.OneOf(["credit", "debit", "cash"]))
    number_of_installments = fields.Int(required=True, validate=validate.Range(min=1))
    description = fields.Str(load_default=None, allow_none=True)

class ExpenseUpdateSchema(Schema):
    amount = fields.Decimal(validate=validate.Range(min=0.01))
    category = fields.Str(validate=validate.Length(min=1, max=50))
    date = fields.Date()
    payment_type = fields.Str(validate=validate.OneOf(["credit", "debit", "cash"]))
    number_of_installments = fields.Int(validate=validate.Range(min=1))
    description = fields.Str(allow_none=True, validate=validate.Length(max=255))

