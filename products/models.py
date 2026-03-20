from django.db import models

from core.models import BaseModel


class Product(BaseModel):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    class Meta:
        db_table = "products"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.sku})"
