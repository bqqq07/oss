from django.db import models

from core.models import BaseModel


class PaymentMethod(BaseModel):
    FEE_TYPE_CHOICES = [
        ("none", "None"),
        ("percentage", "Percentage"),
        ("fixed", "Fixed"),
        ("both", "Both"),
    ]

    name = models.CharField(max_length=100)
    fee_type = models.CharField(
        max_length=10, choices=FEE_TYPE_CHOICES, default="none"
    )
    fee_percentage = models.DecimalField(
        max_digits=6, decimal_places=4, default=0
    )
    fee_fixed = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "payment_methods"
        ordering = ["name"]

    def __str__(self):
        return self.name


class SalesPayment(BaseModel):
    # invoice will become a FK to sales.Invoice once that app is created in a future role
    invoice_id = models.UUIDField(null=True, blank=True, db_index=True)
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.PROTECT,
        related_name="sales_payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fee_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    class Meta:
        db_table = "sales_payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.payment_method} — {self.amount}"
