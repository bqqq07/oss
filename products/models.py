import uuid

from django.db import models


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(BaseModel):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default="")
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )

    class Meta:
        db_table = "categories"
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Brand(BaseModel):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "brands"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(BaseModel):
    full_name = models.CharField(max_length=300)
    sku = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    parent_group = models.CharField(max_length=200, blank=True, default="")
    scent = models.CharField(max_length=100, blank=True, default="")
    size_label = models.CharField(max_length=50, blank=True, default="")
    has_expiry = models.BooleanField(default=False)
    is_returnable = models.BooleanField(default=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    min_stock = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    reorder_point = models.DecimalField(max_digits=10, decimal_places=3, default=0)

    class Meta:
        db_table = "products"
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} ({self.sku})"


class ProductBarcode(BaseModel):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="barcodes",
    )
    barcode = models.CharField(max_length=200, unique=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = "product_barcodes"
        ordering = ["barcode"]

    def __str__(self):
        return f"{self.barcode} → {self.product}"
