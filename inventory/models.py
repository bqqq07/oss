import uuid

from django.db import models

from products.models import Product


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class InventoryBalance(BaseModel):
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="inventory_balance",
    )
    quantity_on_hand = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    quantity_reserved = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    last_counted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "inventory_balances"
        ordering = ["product"]

    def __str__(self):
        return f"{self.product} — {self.quantity_on_hand}"

    @property
    def quantity_available(self):
        return self.quantity_on_hand - self.quantity_reserved


class InventoryMovement(BaseModel):
    MOVEMENT_TYPES = [
        ("in", "Stock In"),
        ("out", "Stock Out"),
        ("adjustment", "Adjustment"),
        ("transfer", "Transfer"),
        ("return", "Return"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="inventory_movements",
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference = models.CharField(max_length=200, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    moved_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_movements",
    )

    class Meta:
        db_table = "inventory_movements"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_movement_type_display()} — {self.product} ({self.quantity})"
