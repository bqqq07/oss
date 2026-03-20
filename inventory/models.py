from django.db import models

from core.models import BaseModel


class Category(BaseModel):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Branch(BaseModel):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        db_table = "branches"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(BaseModel):
    name = models.CharField(max_length=300)
    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, blank=True, default="")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_stock = models.IntegerField(default=0)
    current_stock = models.IntegerField(default=0)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "products"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def is_below_min_stock(self):
        return self.current_stock < self.min_stock
