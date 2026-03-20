import uuid
from decimal import Decimal

from django.test import TestCase

from .models import Supplier


class SupplierModelTest(TestCase):
    def setUp(self):
        self.supplier = Supplier.objects.create(
            name="Beauty Supply Co.",
            mobile="0501234567",
            email="contact@beautysupply.com",
            address="123 Main St, Riyadh",
            contact_person="Ahmed Al-Otaibi",
            notes="Main supplier for skincare products.",
            balance_due=Decimal("1500.00"),
        )

    def test_supplier_created_with_uuid(self):
        self.assertIsInstance(self.supplier.id, uuid.UUID)

    def test_supplier_str(self):
        self.assertEqual(str(self.supplier), "Beauty Supply Co.")

    def test_supplier_is_active_default_true(self):
        self.assertTrue(self.supplier.is_active)

    def test_supplier_has_timestamps(self):
        self.assertIsNotNone(self.supplier.created_at)
        self.assertIsNotNone(self.supplier.updated_at)

    def test_supplier_soft_delete(self):
        self.supplier.is_active = False
        self.supplier.save()
        self.assertFalse(Supplier.objects.get(pk=self.supplier.pk).is_active)

    def test_supplier_balance_due_is_decimal(self):
        self.assertIsInstance(self.supplier.balance_due, Decimal)

    def test_supplier_balance_due_default_zero(self):
        supplier = Supplier.objects.create(name="Minimal Supplier")
        self.assertEqual(supplier.balance_due, Decimal("0"))

    def test_supplier_optional_fields_default_to_empty(self):
        supplier = Supplier.objects.create(name="Minimal Supplier 2")
        self.assertEqual(supplier.mobile, "")
        self.assertEqual(supplier.email, "")
        self.assertEqual(supplier.address, "")
        self.assertEqual(supplier.contact_person, "")
        self.assertEqual(supplier.notes, "")
