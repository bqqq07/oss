from django.db import models

from core.models import BaseModel


class Shift(BaseModel):
    STATUS_OPEN = "open"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_CLOSED, "Closed"),
    ]

    employee = models.ForeignKey(
        "core.Employee",
        on_delete=models.SET_NULL,
        null=True,
        related_name="shifts",
    )
    branch = models.ForeignKey(
        "inventory.Branch",
        on_delete=models.SET_NULL,
        null=True,
        related_name="shifts",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    cash_opening = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_closing = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "shifts"
        ordering = ["-started_at"]

    def __str__(self):
        return f"Shift {self.id} — {self.employee} ({self.status})"


class Sale(BaseModel):
    sale_number = models.CharField(max_length=50, unique=True)
    employee = models.ForeignKey(
        "core.Employee",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales",
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    branch = models.ForeignKey(
        "inventory.Branch",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales",
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "sales"
        ordering = ["-created_at"]

    def __str__(self):
        return self.sale_number


class SaleItem(BaseModel):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "inventory.Product",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sale_items",
    )
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "sale_items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.product} x {self.quantity}"


class SalePayment(BaseModel):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    payment_method = models.ForeignKey(
        "payments.PaymentMethod",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sale_payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "sale_payments"
        ordering = ["id"]

    def __str__(self):
        return f"{self.payment_method} — {self.amount}"


class Return(BaseModel):
    return_number = models.CharField(max_length=50, unique=True)
    sale = models.ForeignKey(
        Sale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="returns",
    )
    employee = models.ForeignKey(
        "core.Employee",
        on_delete=models.SET_NULL,
        null=True,
        related_name="returns",
    )
    branch = models.ForeignKey(
        "inventory.Branch",
        on_delete=models.SET_NULL,
        null=True,
        related_name="returns",
    )
    reason = models.TextField(blank=True, default="")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "returns"
        ordering = ["-created_at"]

    def __str__(self):
        return self.return_number


class ReturnItem(BaseModel):
    return_obj = models.ForeignKey(Return, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "inventory.Product",
        on_delete=models.SET_NULL,
        null=True,
        related_name="return_items",
    )
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "return_items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.product} x {self.quantity}"
