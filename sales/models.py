from django.db import models
from django.utils import timezone

from core.models import BaseModel, Employee
from inventory.models import Product


class SalesInvoice(BaseModel):
    """A sales transaction invoice issued to a customer."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("partially_returned", "Partially Returned"),
        ("fully_returned", "Fully Returned"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("transfer", "Transfer"),
        ("card", "Card"),
        ("store_credit", "Store Credit"),
    ]

    invoice_number = models.CharField(max_length=30, unique=True)
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="sales_invoices",
    )
    customer_name = models.CharField(max_length=200, blank=True, default="")
    invoice_date = models.DateField(default=timezone.now)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default="pending")
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES, default="cash"
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "sales_invoices"
        ordering = ["-invoice_date", "-created_at"]

    def __str__(self):
        return self.invoice_number


class SalesInvoiceItem(BaseModel):
    """A single line item within a sales invoice."""

    sales_invoice = models.ForeignKey(
        SalesInvoice,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="sales_invoice_items",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    avg_cost_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "sales_invoice_items"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sales_invoice.invoice_number} — {self.product.name}"


class SalesReturn(BaseModel):
    """A return transaction linked to an original sales invoice."""

    REFUND_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("transfer", "Transfer"),
        ("store_credit", "Store Credit"),
    ]

    sales_invoice = models.ForeignKey(
        SalesInvoice,
        on_delete=models.PROTECT,
        related_name="returns",
    )
    return_number = models.CharField(max_length=30, unique=True)
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="sales_returns",
    )
    return_date = models.DateField(default=timezone.now)
    refund_method = models.CharField(
        max_length=20, choices=REFUND_METHOD_CHOICES, default="cash"
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "sales_returns"
        ordering = ["-return_date", "-created_at"]

    def __str__(self):
        return self.return_number


class SalesReturnItem(BaseModel):
    """A single line item within a sales return."""

    sales_return = models.ForeignKey(
        SalesReturn,
        on_delete=models.CASCADE,
        related_name="items",
    )
    sales_invoice_item = models.ForeignKey(
        SalesInvoiceItem,
        on_delete=models.PROTECT,
        related_name="return_items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="sales_return_items",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    avg_cost_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Negative value = reduced profit (revenue lost > cost recouped)
    line_effect_on_profit = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    class Meta:
        db_table = "sales_return_items"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sales_return.return_number} — {self.product.name}"
