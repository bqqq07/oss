import uuid
from decimal import Decimal

from django.test import TestCase

from .models import Brand, Category, Product, ProductBarcode


class CategoryModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="Electronics",
            description="Electronic devices",
        )

    def test_category_created_with_uuid(self):
        self.assertIsInstance(self.category.id, uuid.UUID)

    def test_category_str(self):
        self.assertEqual(str(self.category), "Electronics")

    def test_category_is_active_default_true(self):
        self.assertTrue(self.category.is_active)

    def test_category_has_timestamps(self):
        self.assertIsNotNone(self.category.created_at)
        self.assertIsNotNone(self.category.updated_at)

    def test_category_name_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Category.objects.create(name="Electronics")

    def test_category_parent_child(self):
        child = Category.objects.create(name="Laptops", parent=self.category)
        self.assertEqual(child.parent, self.category)
        self.assertIn(child, self.category.children.all())

    def test_category_soft_delete(self):
        self.category.is_active = False
        self.category.save()
        self.assertFalse(Category.objects.get(pk=self.category.pk).is_active)


class BrandModelTest(TestCase):
    def setUp(self):
        self.brand = Brand.objects.create(name="Samsung", description="Korean brand")

    def test_brand_created_with_uuid(self):
        self.assertIsInstance(self.brand.id, uuid.UUID)

    def test_brand_str(self):
        self.assertEqual(str(self.brand), "Samsung")

    def test_brand_is_active_default_true(self):
        self.assertTrue(self.brand.is_active)

    def test_brand_has_timestamps(self):
        self.assertIsNotNone(self.brand.created_at)
        self.assertIsNotNone(self.brand.updated_at)

    def test_brand_name_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Brand.objects.create(name="Samsung")

    def test_brand_soft_delete(self):
        self.brand.is_active = False
        self.brand.save()
        self.assertFalse(Brand.objects.get(pk=self.brand.pk).is_active)


class ProductModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Phones")
        self.brand = Brand.objects.create(name="Apple")
        self.product = Product.objects.create(
            name="iPhone 15",
            sku="IPH-15-001",
            category=self.category,
            brand=self.brand,
            cost_price=Decimal("800.00"),
            selling_price=Decimal("1200.00"),
            reorder_level=Decimal("5.000"),
        )

    def test_product_created_with_uuid(self):
        self.assertIsInstance(self.product.id, uuid.UUID)

    def test_product_str(self):
        self.assertEqual(str(self.product), "iPhone 15 (IPH-15-001)")

    def test_product_is_active_default_true(self):
        self.assertTrue(self.product.is_active)

    def test_product_has_timestamps(self):
        self.assertIsNotNone(self.product.created_at)
        self.assertIsNotNone(self.product.updated_at)

    def test_product_sku_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Product.objects.create(name="Other", sku="IPH-15-001")

    def test_product_cost_price_is_decimal(self):
        self.assertIsInstance(self.product.cost_price, Decimal)

    def test_product_selling_price_is_decimal(self):
        self.assertIsInstance(self.product.selling_price, Decimal)

    def test_product_reorder_level_is_decimal(self):
        self.assertIsInstance(self.product.reorder_level, Decimal)

    def test_product_category_relation(self):
        self.assertEqual(self.product.category, self.category)

    def test_product_brand_relation(self):
        self.assertEqual(self.product.brand, self.brand)

    def test_product_soft_delete(self):
        self.product.is_active = False
        self.product.save()
        self.assertFalse(Product.objects.get(pk=self.product.pk).is_active)


class ProductBarcodeModelTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(name="Galaxy S24", sku="SAM-S24-001")
        self.barcode = ProductBarcode.objects.create(
            product=self.product,
            barcode="6901234567890",
            is_primary=True,
        )

    def test_barcode_created_with_uuid(self):
        self.assertIsInstance(self.barcode.id, uuid.UUID)

    def test_barcode_str(self):
        self.assertIn("6901234567890", str(self.barcode))
        self.assertIn("Galaxy S24", str(self.barcode))

    def test_barcode_is_active_default_true(self):
        self.assertTrue(self.barcode.is_active)

    def test_barcode_has_timestamps(self):
        self.assertIsNotNone(self.barcode.created_at)
        self.assertIsNotNone(self.barcode.updated_at)

    def test_barcode_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            ProductBarcode.objects.create(
                product=self.product, barcode="6901234567890"
            )

    def test_barcode_product_relation(self):
        self.assertEqual(self.barcode.product, self.product)
        self.assertIn(self.barcode, self.product.barcodes.all())

    def test_barcode_is_primary(self):
        self.assertTrue(self.barcode.is_primary)

    def test_barcode_soft_delete(self):
        self.barcode.is_active = False
        self.barcode.save()
        self.assertFalse(ProductBarcode.objects.get(pk=self.barcode.pk).is_active)
