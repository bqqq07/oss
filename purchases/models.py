from django.db import models

from core.models import BaseModel
from suppliers.models import Supplier


class PurchaseInvoice(BaseModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
    ]

    invoice_number = models.CharField(max_length=100, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_invoices",
    )
    invoice_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    notes = models.TextField(blank=True, default="")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = "purchase_invoices"
        ordering = ["-invoice_date"]

    def __str__(self):
        return f"{self.invoice_number} — {self.supplier}"


class PurchaseInvoiceItem(BaseModel):
    invoice = models.ForeignKey(
        PurchaseInvoice,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="purchase_invoice_items",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "purchase_invoice_items"
        ordering = ["invoice", "product"]

    def __str__(self):
        return f"{self.invoice.invoice_number} — {self.product}"

    def save(self, *args, **kwargs):
        self.total_cost = self.quantity * self.unit_cost
        super().save(*args, **kwargs)


class PurchaseReturn(BaseModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
    ]

    return_number = models.CharField(max_length=100, unique=True)
    invoice = models.ForeignKey(
        PurchaseInvoice,
        on_delete=models.PROTECT,
        related_name="purchase_returns",
    )
    return_date = models.DateField()
    reason = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = "purchase_returns"
        ordering = ["-return_date"]

    def __str__(self):
        return f"{self.return_number} — {self.invoice}"


class PurchaseReturnItem(BaseModel):
    purchase_return = models.ForeignKey(
        PurchaseReturn,
        on_delete=models.CASCADE,
        related_name="items",
    )
    invoice_item = models.ForeignKey(
        PurchaseInvoiceItem,
        on_delete=models.PROTECT,
        related_name="return_items",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "purchase_return_items"
        ordering = ["purchase_return"]

    def __str__(self):
        return f"{self.purchase_return.return_number} — {self.invoice_item}"

    def save(self, *args, **kwargs):
        self.total_cost = self.quantity * self.unit_cost
        super().save(*args, **kwargs)
