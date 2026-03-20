import uuid

from django.db import models
from django.utils import timezone

from core.models import BaseModel


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------

class Customer(BaseModel):
    """Walk-in or registered customer."""

    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")

    class Meta:
        db_table = "sales_customers"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


# ---------------------------------------------------------------------------
# Product stub
# ---------------------------------------------------------------------------

class Product(BaseModel):
    """
    Minimal product stub that satisfies SalesInvoiceItem's FK.

    This model will be superseded by ``inventory.Product`` once the
    inventory app is created (ROLE-06+).  At that point a data migration
    will transfer the FK from ``sales.Product`` to ``inventory.Product``.
    """

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "sales_product_stub"
        ordering = ["sku"]

    def __str__(self) -> str:
        return f"{self.sku} – {self.name}"


# ---------------------------------------------------------------------------
# Shift
# ---------------------------------------------------------------------------

class Shift(BaseModel):
    STATUS_OPEN = "open"
    STATUS_CLOSED = "closed"
    STATUS_SUSPENDED = "suspended"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_CLOSED, "Closed"),
        (STATUS_SUSPENDED, "Suspended"),
    ]

    employee = models.ForeignKey(
        "core.Employee",
        on_delete=models.PROTECT,
        related_name="shifts",
    )
    device = models.ForeignKey(
        "core.Device",
        on_delete=models.PROTECT,
        related_name="shifts",
    )
    opened_at = models.DateTimeField()
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_cash_expected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_cash_actual = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)

    class Meta:
        db_table = "sales_shifts"
        ordering = ["-opened_at"]

    def __str__(self) -> str:
        return f"Shift {self.id} — {self.employee} ({self.status})"


# ---------------------------------------------------------------------------
# SalesInvoice
# ---------------------------------------------------------------------------

class SalesInvoice(BaseModel):
    STATUS_COMPLETED = "completed"
    STATUS_PARTIALLY_RETURNED = "partially_returned"
    STATUS_FULLY_RETURNED = "fully_returned"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_COMPLETED, "Completed"),
        (STATUS_PARTIALLY_RETURNED, "Partially Returned"),
        (STATUS_FULLY_RETURNED, "Fully Returned"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    SYNC_PENDING = "pending"
    SYNC_SYNCED = "synced"
    SYNC_FAILED = "failed"

    SYNC_STATUS_CHOICES = [
        (SYNC_PENDING, "Pending"),
        (SYNC_SYNCED, "Synced"),
        (SYNC_FAILED, "Failed"),
    ]

    # Format: INV-YYYYMMDD-XXXXX  (XXXXX = zero-padded daily sequence)
    invoice_no = models.CharField(max_length=20, unique=True, editable=False, blank=True)

    shift = models.ForeignKey(
        Shift,
        on_delete=models.PROTECT,
        related_name="invoices",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    employee = models.ForeignKey(
        "core.Employee",
        on_delete=models.PROTECT,
        related_name="invoices",
    )
    sold_at = models.DateTimeField(default=timezone.now)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_COMPLETED
    )
    sync_status = models.CharField(
        max_length=20, choices=SYNC_STATUS_CHOICES, default=SYNC_PENDING
    )

    class Meta:
        db_table = "sales_invoices"
        ordering = ["-sold_at"]

    def __str__(self) -> str:
        return self.invoice_no

    # ------------------------------------------------------------------
    # invoice_no generation  —  INV-YYYYMMDD-XXXXX
    # ------------------------------------------------------------------

    @classmethod
    def _next_invoice_no(cls) -> str:
        today = timezone.now().date()
        prefix = today.strftime("INV-%Y%m%d-")
        last_no = (
            cls.objects.filter(invoice_no__startswith=prefix)
            .order_by("-invoice_no")
            .values_list("invoice_no", flat=True)
            .first()
        )
        seq = int(last_no.rsplit("-", 1)[-1]) + 1 if last_no else 1
        return f"{prefix}{seq:05d}"

    def save(self, *args, **kwargs) -> None:
        if not self.invoice_no:
            self.invoice_no = self._next_invoice_no()
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# SalesInvoiceItem
# ---------------------------------------------------------------------------

class SalesInvoiceItem(BaseModel):
    invoice = models.ForeignKey(
        SalesInvoice,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="invoice_items",
        null=True,
        blank=True,
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    avg_cost_snapshot = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    line_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "sales_invoice_items"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.invoice.invoice_no} — item {self.id}"


# ---------------------------------------------------------------------------
# CashMovement
# ---------------------------------------------------------------------------

class CashMovement(BaseModel):
    TYPE_CASH_IN = "cash_in"
    TYPE_CASH_OUT = "cash_out"
    TYPE_SALE = "sale"
    TYPE_REFUND = "refund"

    MOVEMENT_TYPE_CHOICES = [
        (TYPE_CASH_IN, "Cash In"),
        (TYPE_CASH_OUT, "Cash Out"),
        (TYPE_SALE, "Sale"),
        (TYPE_REFUND, "Refund"),
    ]

    shift = models.ForeignKey(
        Shift,
        on_delete=models.PROTECT,
        related_name="cash_movements",
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "core.Employee",
        on_delete=models.PROTECT,
        related_name="cash_movements",
    )

    class Meta:
        db_table = "sales_cash_movements"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.movement_type} — {self.amount}"
