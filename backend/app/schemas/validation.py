from decimal import Decimal
from marshmallow import fields, ValidationError


class NormalizedEmail(fields.Email):
    def _deserialize(self, value, attr, data, **kwargs):
        if isinstance(value, str):
            value = value.strip().lower()
        result = super()._deserialize(value, attr, data, **kwargs)
        if len(result) > 254:
            raise ValidationError("Email must be at most 254 characters.")
        return result


class TrimmedString(fields.String):
    def _deserialize(self, value, attr, data, **kwargs):
        value = super()._deserialize(value, attr, data, **kwargs).strip()
        if not value or any(ord(char) < 32 for char in value):
            raise ValidationError("Enter text without control characters.")
        return value


def money_range(minimum="0.01", maximum="99999999.99"):
    def validate_money(value):
        if not value.is_finite() or not Decimal(minimum) <= value <= Decimal(maximum):
            raise ValidationError(f"Enter an amount between {minimum} and {maximum}.")
        if value != value.quantize(Decimal("0.01")):
            raise ValidationError("Use no more than two decimal places.")
    return validate_money
