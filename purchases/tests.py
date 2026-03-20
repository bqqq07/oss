import uuid
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from products.models import Product
from suppliers.models import Supplier

from .models import (
    PurchaseInvoice,
    PurchaseInvoiceItem,
    PurchaseReturn,
    PurchaseReturnItem,
)
from .services import apply_purchase_invoice, apply_purchase_return, compute_weighted_average_cost


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(username="testuser"):
    return User.objects.create_user(username=username, password="pass")


def make_supplier(**kwargs):
    defaults = {"name": "Test Supplier"}
    defaults.update(kwargs)
    return Supplier.objects.create(**defaults)


def make_product(**kwargs):
    defaults = {
        "name": "Test Product",
        "sku": "SKU-001",
        "average_cost": Decimal("0.00"),
        "stock_quantity": Decimal("0.000"),
    }
    defaults.update(kwargs)
    return Product.objects.create(**defaults)


def make_invoice(supplier, user, **kwargs):
    defaults = {
        "invoice_number": "INV-001",
        "invoice_date": "2026-01-15",
        "status": "draft",
        "subtotal": Decimal("0.00"),
        "vat_amount": Decimal("0.00"),
        "total_amount": Decimal("0.00"),
        "paid_amount": Decimal("0.00"),
    }
    defaults.update(kwargs)
    return PurchaseInvoice.objects.create(supplier=supplier, created_by=user, **defaults)


# ---------------------------------------------------------------------------
# PurchaseInvoice model tests
# ---------------------------------------------------------------------------

class PurchaseInvoiceModelTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.supplier = make_supplier()
        self.invoice = make_invoice(self.supplier, self.user)

    def test_invoice_created_with_uuid(self):
        self.assertIsInstance(self.invoice.id, uuid.UUID)

    def test_invoice_str(self):
        self.assertIn("INV-001", str(self.invoice))
        self.assertIn("Test Supplier", str(self.invoice))

    def test_invoice_is_active_default_true(self):
        self.assertTrue(self.invoice.is_active)

    def test_invoice_has_timestamps(self):
        self.assertIsNotNone(self.invoice.created_at)
        self.assertIsNotNone(self.invoice.updated_at)

    def test_invoice_default_status_is_draft(self):
        self.assertEqual(self.invoice.status, "draft")

    def test_invoice_has_created_by(self):
        self.assertEqual(self.invoice.created_by, self.user)

    def test_invoice_financial_fields_are_decimal(self):
        self.assertIsInstance(self.invoice.subtotal, Decimal)
        self.assertIsInstance(self.invoice.vat_amount, Decimal)
        self.assertIsInstance(self.invoice.total_amount, Decimal)
        self.assertIsInstance(self.invoice.paid_amount, Decimal)

    def test_invoice_number_unique(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            make_invoice(self.supplier, self.user, invoice_number="INV-001")

    def test_invoice_soft_delete(self):
        self.invoice.is_active = False
        self.invoice.save()
        self.assertFalse(PurchaseInvoice.objects.get(pk=self.invoice.pk).is_active)

    def test_invoice_status_choices(self):
        valid_statuses = {"draft", "confirmed", "partially_paid", "paid"}
        choice_values = {c[0] for c in PurchaseInvoice.STATUS_CHOICES}
        self.assertEqual(choice_values, valid_statuses)


# ---------------------------------------------------------------------------
# PurchaseInvoiceItem model tests
# ---------------------------------------------------------------------------

class PurchaseInvoiceItemModelTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.supplier = make_supplier()
        self.invoice = make_invoice(self.supplier, self.user)
        self.product = make_product()
        self.item = PurchaseInvoiceItem.objects.create(
            invoice=self.invoice,
            product=self.product,
            quantity=Decimal("10.000"),
            unit_cost=Decimal("25.00"),
            total_cost=Decimal("250.00"),
        )

    def test_item_created_with_uuid(self):
        self.assertIsInstance(self.item.id, uuid.UUID)

    def test_item_str(self):
        self.assertIn("INV-001", str(self.item))

    def test_item_is_active_default_true(self):
        self.assertTrue(self.item.is_active)

    def test_item_has_timestamps(self):
        self.assertIsNotNone(self.item.created_at)
        self.assertIsNotNone(self.item.updated_at)

    def test_item_total_cost_is_decimal(self):
        self.assertIsInstance(self.item.total_cost, Decimal)

    def test_item_save_auto_computes_total_cost(self):
        item = PurchaseInvoiceItem(
            invoice=self.invoice,
            product=self.product,
            quantity=Decimal("5.000"),
            unit_cost=Decimal("20.00"),
            total_cost=Decimal("0.00"),
        )
        item.save()
        self.assertEqual(item.total_cost, Decimal("100.00"))

    def test_item_product_is_from_products_app(self):
        from products.models import Product as ProductModel
        self.assertIsInstance(self.item.product, ProductModel)


# ---------------------------------------------------------------------------
# PurchaseReturn model tests
# ---------------------------------------------------------------------------

class PurchaseReturnModelTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.supplier = make_supplier()
        self.invoice = make_invoice(self.supplier, self.user)
        self.product = make_product()
        PurchaseInvoiceItem.objects.create(
            invoice=self.invoice,
            product=self.product,
            quantity=Decimal("10.000"),
            unit_cost=Decimal("25.00"),
            total_cost=Decimal("250.00"),
        )
        self.purchase_return = PurchaseReturn.objects.create(
            return_number="RET-001",
            invoice=self.invoice,
            return_date="2026-01-20",
            reason="Damaged goods",
            status="draft",
            total_amount=Decimal("50.00"),
        )

    def test_return_created_with_uuid(self):
        self.assertIsInstance(self.purchase_return.id, uuid.UUID)

    def test_return_str(self):
        self.assertIn("RET-001", str(self.purchase_return))

    def test_return_is_active_default_true(self):
        self.assertTrue(self.purchase_return.is_active)

    def test_return_has_timestamps(self):
        self.assertIsNotNone(self.purchase_return.created_at)
        self.assertIsNotNone(self.purchase_return.updated_at)

    def test_return_number_unique(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            PurchaseReturn.objects.create(
                return_number="RET-001",
                invoice=self.invoice,
                return_date="2026-01-21",
            )


class PurchaseReturnItemModelTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.supplier = make_supplier()
        self.invoice = make_invoice(self.supplier, self.user)
        self.product = make_product()
        self.inv_item = PurchaseInvoiceItem.objects.create(
            invoice=self.invoice,
            product=self.product,
            quantity=Decimal("10.000"),
            unit_cost=Decimal("25.00"),
            total_cost=Decimal("250.00"),
        )
        self.purchase_return = PurchaseReturn.objects.create(
            return_number="RET-001",
            invoice=self.invoice,
            return_date="2026-01-20",
        )
        self.ret_item = PurchaseReturnItem.objects.create(
            purchase_return=self.purchase_return,
            invoice_item=self.inv_item,
            quantity=Decimal("2.000"),
            unit_cost=Decimal("25.00"),
            total_cost=Decimal("50.00"),
        )

    def test_return_item_created_with_uuid(self):
        self.assertIsInstance(self.ret_item.id, uuid.UUID)

    def test_return_item_save_auto_computes_total_cost(self):
        item = PurchaseReturnItem(
            purchase_return=self.purchase_return,
            invoice_item=self.inv_item,
            quantity=Decimal("3.000"),
            unit_cost=Decimal("25.00"),
            total_cost=Decimal("0.00"),
        )
        item.save()
        self.assertEqual(item.total_cost, Decimal("75.00"))


# ---------------------------------------------------------------------------
# services: compute_weighted_average_cost
# ---------------------------------------------------------------------------

class WeightedAverageCostTest(TestCase):
    def test_first_purchase_zero_stock(self):
        result = compute_weighted_average_cost(
            old_quantity=Decimal("0"),
            old_average_cost=Decimal("0"),
            new_quantity=Decimal("10"),
            new_unit_cost=Decimal("20.00"),
        )
        self.assertEqual(result, Decimal("20.00"))

    def test_second_purchase_same_cost(self):
        result = compute_weighted_average_cost(
            old_quantity=Decimal("10"),
            old_average_cost=Decimal("20.00"),
            new_quantity=Decimal("10"),
            new_unit_cost=Decimal("20.00"),
        )
        self.assertEqual(result, Decimal("20.00"))

    def test_second_purchase_higher_cost(self):
        # (10*20 + 10*30) / 20 = 500/20 = 25.00
        result = compute_weighted_average_cost(
            old_quantity=Decimal("10"),
            old_average_cost=Decimal("20.00"),
            new_quantity=Decimal("10"),
            new_unit_cost=Decimal("30.00"),
        )
        self.assertEqual(result, Decimal("25.00"))

    def test_unequal_quantities(self):
        # (100*10 + 50*16) / 150 = (1000+800)/150 = 1800/150 = 12.00
        result = compute_weighted_average_cost(
            old_quantity=Decimal("100"),
            old_average_cost=Decimal("10.00"),
            new_quantity=Decimal("50"),
            new_unit_cost=Decimal("16.00"),
        )
        self.assertEqual(result, Decimal("12.00"))

    def test_result_rounded_to_two_decimals(self):
        # (1*10 + 1*11) / 2 = 10.50 exactly
        result = compute_weighted_average_cost(
            old_quantity=Decimal("1"),
            old_average_cost=Decimal("10.00"),
            new_quantity=Decimal("1"),
            new_unit_cost=Decimal("11.00"),
        )
        self.assertEqual(result, Decimal("10.50"))

    def test_raises_when_total_quantity_is_zero(self):
        with self.assertRaises(ValueError):
            compute_weighted_average_cost(
                old_quantity=Decimal("0"),
                old_average_cost=Decimal("0"),
                new_quantity=Decimal("0"),
                new_unit_cost=Decimal("20.00"),
            )


# ---------------------------------------------------------------------------
# services: apply_purchase_invoice
# ---------------------------------------------------------------------------

class ApplyPurchaseInvoiceTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.supplier = make_supplier()
        self.product = make_product(
            sku="SKU-100",
            average_cost=Decimal("0.00"),
            stock_quantity=Decimal("0.000"),
        )
        self.invoice = make_invoice(self.supplier, self.user, invoice_number="INV-100")
        PurchaseInvoiceItem.objects.create(
            invoice=self.invoice,
            product=self.product,
            quantity=Decimal("10.000"),
            unit_cost=Decimal("50.00"),
            total_cost=Decimal("500.00"),
        )

    def test_apply_sets_status_to_confirmed(self):
        apply_purchase_invoice(self.invoice)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "confirmed")

    def test_apply_updates_product_stock_quantity(self):
        apply_purchase_invoice(self.invoice)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, Decimal("10.000"))

    def test_apply_updates_product_average_cost(self):
        apply_purchase_invoice(self.invoice)
        self.product.refresh_from_db()
        self.assertEqual(self.product.average_cost, Decimal("50.00"))

    def test_apply_twice_updates_weighted_average(self):
        apply_purchase_invoice(self.invoice)
        # Second invoice: 10 units at 70.00 → new avg = (10*50 + 10*70)/20 = 60.00
        invoice2 = make_invoice(self.supplier, self.user, invoice_number="INV-101")
        PurchaseInvoiceItem.objects.create(
            invoice=invoice2,
            product=self.product,
            quantity=Decimal("10.000"),
            unit_cost=Decimal("70.00"),
            total_cost=Decimal("700.00"),
        )
        apply_purchase_invoice(invoice2)
        self.product.refresh_from_db()
        self.assertEqual(self.product.average_cost, Decimal("60.00"))
        self.assertEqual(self.product.stock_quantity, Decimal("20.000"))

    def test_apply_raises_if_not_draft(self):
        self.invoice.status = "confirmed"
        self.invoice.save()
        with self.assertRaises(ValueError):
            apply_purchase_invoice(self.invoice)


# ---------------------------------------------------------------------------
# services: apply_purchase_return
# ---------------------------------------------------------------------------

class ApplyPurchaseReturnTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.supplier = make_supplier()
        self.product = make_product(
            sku="SKU-200",
            average_cost=Decimal("50.00"),
            stock_quantity=Decimal("10.000"),
        )
        self.invoice = make_invoice(
            self.supplier, self.user, invoice_number="INV-200", status="confirmed"
        )
        self.inv_item = PurchaseInvoiceItem.objects.create(
            invoice=self.invoice,
            product=self.product,
            quantity=Decimal("10.000"),
            unit_cost=Decimal("50.00"),
            total_cost=Decimal("500.00"),
        )
        self.purchase_return = PurchaseReturn.objects.create(
            return_number="RET-200",
            invoice=self.invoice,
            return_date="2026-01-25",
            reason="Wrong items",
            status="draft",
            total_amount=Decimal("100.00"),
        )
        PurchaseReturnItem.objects.create(
            purchase_return=self.purchase_return,
            invoice_item=self.inv_item,
            quantity=Decimal("2.000"),
            unit_cost=Decimal("50.00"),
            total_cost=Decimal("100.00"),
        )

    def test_return_sets_status_to_confirmed(self):
        apply_purchase_return(self.purchase_return)
        self.purchase_return.refresh_from_db()
        self.assertEqual(self.purchase_return.status, "confirmed")

    def test_return_reduces_stock_quantity(self):
        apply_purchase_return(self.purchase_return)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, Decimal("8.000"))

    def test_return_resets_cost_when_stock_reaches_zero(self):
        # Return all 10 units
        PurchaseReturnItem.objects.filter(purchase_return=self.purchase_return).delete()
        PurchaseReturnItem.objects.create(
            purchase_return=self.purchase_return,
            invoice_item=self.inv_item,
            quantity=Decimal("10.000"),
            unit_cost=Decimal("50.00"),
            total_cost=Decimal("500.00"),
        )
        apply_purchase_return(self.purchase_return)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, Decimal("0.000"))
        self.assertEqual(self.product.average_cost, Decimal("0.00"))

    def test_return_raises_if_not_draft(self):
        self.purchase_return.status = "confirmed"
        self.purchase_return.save()
        with self.assertRaises(ValueError):
            apply_purchase_return(self.purchase_return)
