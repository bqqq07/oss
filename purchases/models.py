from django.db import models

from core.models import BaseModel


class Supplier(BaseModel):
    name = models.CharField(max_length=300)
    contact_name = models.CharField(max_length=200, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")

    class Meta:
        db_table = "suppliers"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PurchaseOrder(BaseModel):
    STATUS_PENDING = "pending"
    STATUS_RECEIVED = "received"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_RECEIVED, "Received"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    order_number = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders",
    )
    employee = models.ForeignKey(
        "core.Employee",
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchase_orders",
    )
    order_date = models.DateField()
    received_date = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "purchase_orders"
        ordering = ["-order_date"]

    def __str__(self):
        return self.order_number


class PurchaseItem(BaseModel):
    purchase = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "inventory.Product",
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchase_items",
    )
    quantity = models.IntegerField(default=1)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = "purchase_items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.product} x {self.quantity}"
