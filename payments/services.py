from decimal import Decimal


def calculate_fee(payment_method, amount: Decimal) -> Decimal:
    """Calculate the transaction fee for a given payment method and amount.

    fee_type choices:
      - none:       no fee
      - percentage: amount * (fee_percentage / 100)
      - fixed:      fee_fixed
      - both:       (amount * fee_percentage / 100) + fee_fixed
    """
    amount = Decimal(str(amount))

    if payment_method.fee_type == "percentage":
        return (amount * payment_method.fee_percentage / Decimal("100")).quantize(
            Decimal("0.01")
        )

    if payment_method.fee_type == "fixed":
        return Decimal(str(payment_method.fee_fixed)).quantize(Decimal("0.01"))

    if payment_method.fee_type == "both":
        pct_part = amount * payment_method.fee_percentage / Decimal("100")
        return (pct_part + payment_method.fee_fixed).quantize(Decimal("0.01"))

    # none
    return Decimal("0.00")
