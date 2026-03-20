from django.db import models

from core.models import BaseModel


class Product(BaseModel):
    """Product available for sale in the POS system."""

    UNIT_CHOICES = [
        ("piece", "Piece"),
        ("box", "Box"),
        ("bottle", "Bottle"),
        ("kg", "Kilogram"),
        ("liter", "Liter"),
    ]

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default="piece")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity_on_hand = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    class Meta:
        db_table = "products"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.sku})"
