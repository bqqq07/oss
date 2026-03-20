"""
Tests for ROLE-06: Sales Returns.

Covers:
- SalesReturn model creation and constraints
- SalesReturnItem model creation
- return_number format (SR-YYYYMMDD-XXXXX)
- process_sales_return service:
  - Inventory restoration with avg_cost recalculation
  - SalesInvoice status update (partially_returned / fully_returned)
  - line_effect_on_profit calculation
  - Validation errors (qty > returnable, invalid refund_method, empty items)
  - Sequential return numbers on same day
"""

import uuid
from datetime import date
from decimal import Decimal

from django.test import TestCase

from core.models import Employee
from inventory.models import Product
from sales.models import (
    SalesInvoice,
    SalesInvoiceItem,
    SalesReturn,
    SalesReturnItem,
)
from sales.services import _generate_return_number, process_sales_return


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_employee(**kwargs):
    defaults = {
        "full_name": "Test Employee",
        "email": f"emp-{uuid.uuid4().hex[:8]}@test.com",
        "salary": Decimal("3000.00"),
    }
    defaults.update(kwargs)
    return Employee.objects.create(**defaults)


def make_product(**kwargs):
    defaults = {
        "name": "Test Product",
        "sku": f"SKU-{uuid.uuid4().hex[:8]}",
        "unit_price": Decimal("100.00"),
        "avg_cost": Decimal("60.00"),
        "quantity_on_hand": Decimal("50.000"),
    }
    defaults.update(kwargs)
    return Product.objects.create(**defaults)


def make_invoice(employee, **kwargs):
    defaults = {
        "invoice_number": f"INV-{uuid.uuid4().hex[:8]}",
        "employee": employee,
        "status": "completed",
        "total_amount": Decimal("500.00"),
    }
    defaults.update(kwargs)
    return SalesInvoice.objects.create(**defaults)


def make_invoice_item(invoice, product, quantity, unit_price, avg_cost, **kwargs):
    return SalesInvoiceItem.objects.create(
        sales_invoice=invoice,
        product=product,
        quantity=Decimal(str(quantity)),
        unit_price=Decimal(str(unit_price)),
        avg_cost_snapshot=Decimal(str(avg_cost)),
        line_total=(Decimal(str(quantity)) * Decimal(str(unit_price))).quantize(
            Decimal("0.01")
        ),
        **kwargs,
    )


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class SalesReturnModelTest(TestCase):
    def setUp(self):
        self.employee = make_employee()
        self.product = make_product()
        self.invoice = make_invoice(self.employee)
        self.invoice_item = make_invoice_item(
            self.invoice, self.product, 5, "100.00", "60.00"
        )

    def test_uuid_primary_key(self):
        sr = SalesReturn.objects.create(
            sales_invoice=self.invoice,
            return_number="SR-20260101-00001",
            employee=self.employee,
            return_date=date(2026, 1, 1),
            refund_method="cash",
            total_amount=Decimal("100.00"),
        )
        self.assertIsInstance(sr.id, uuid.UUID)

    def test_is_active_default_true(self):
        sr = SalesReturn.objects.create(
            sales_invoice=self.invoice,
            return_number="SR-20260101-00002",
            employee=self.employee,
            return_date=date(2026, 1, 1),
            refund_method="cash",
            total_amount=Decimal("100.00"),
        )
        self.assertTrue(sr.is_active)

    def test_timestamps_set_on_create(self):
        sr = SalesReturn.objects.create(
            sales_invoice=self.invoice,
            return_number="SR-20260101-00003",
            employee=self.employee,
            return_date=date(2026, 1, 1),
            refund_method="cash",
            total_amount=Decimal("0.00"),
        )
        self.assertIsNotNone(sr.created_at)
        self.assertIsNotNone(sr.updated_at)

    def test_str_returns_return_number(self):
        sr = SalesReturn(return_number="SR-20260315-00001")
        self.assertEqual(str(sr), "SR-20260315-00001")

    def test_return_number_unique(self):
        from django.db import IntegrityError

        SalesReturn.objects.create(
            sales_invoice=self.invoice,
            return_number="SR-DUP-00001",
            employee=self.employee,
            refund_method="cash",
            total_amount=Decimal("0"),
        )
        with self.assertRaises(IntegrityError):
            SalesReturn.objects.create(
                sales_invoice=self.invoice,
                return_number="SR-DUP-00001",
                employee=self.employee,
                refund_method="cash",
                total_amount=Decimal("0"),
            )

    def test_decimal_field_not_float(self):
        field = SalesReturn._meta.get_field("total_amount")
        from django.db.models import DecimalField

        self.assertIsInstance(field, DecimalField)


class SalesReturnItemModelTest(TestCase):
    def setUp(self):
        self.employee = make_employee()
        self.product = make_product()
        self.invoice = make_invoice(self.employee)
        self.invoice_item = make_invoice_item(
            self.invoice, self.product, 10, "100.00", "60.00"
        )
        self.sales_return = SalesReturn.objects.create(
            sales_invoice=self.invoice,
            return_number="SR-20260101-00001",
            employee=self.employee,
            refund_method="cash",
            total_amount=Decimal("200.00"),
        )

    def test_uuid_primary_key(self):
        item = SalesReturnItem.objects.create(
            sales_return=self.sales_return,
            sales_invoice_item=self.invoice_item,
            product=self.product,
            quantity=Decimal("2"),
            unit_price=Decimal("100.00"),
            avg_cost_snapshot=Decimal("60.00"),
            line_effect_on_profit=Decimal("-80.00"),
        )
        self.assertIsInstance(item.id, uuid.UUID)

    def test_str(self):
        item = SalesReturnItem(
            sales_return=self.sales_return,
            product=self.product,
        )
        self.assertIn(self.product.name, str(item))

    def test_decimal_fields_not_float(self):
        from django.db.models import DecimalField

        for field_name in ("unit_price", "avg_cost_snapshot", "line_effect_on_profit"):
            field = SalesReturnItem._meta.get_field(field_name)
            self.assertIsInstance(field, DecimalField, msg=f"{field_name} must be DecimalField")

    def test_is_active_default_true(self):
        item = SalesReturnItem.objects.create(
            sales_return=self.sales_return,
            sales_invoice_item=self.invoice_item,
            product=self.product,
            quantity=Decimal("1"),
            unit_price=Decimal("100.00"),
            avg_cost_snapshot=Decimal("60.00"),
            line_effect_on_profit=Decimal("-40.00"),
        )
        self.assertTrue(item.is_active)


# ---------------------------------------------------------------------------
# Return number generation
# ---------------------------------------------------------------------------

class ReturnNumberGenerationTest(TestCase):
    def setUp(self):
        self.employee = make_employee()
        self.product = make_product()
        self.invoice = make_invoice(self.employee)

    def test_format_is_correct(self):
        number = _generate_return_number(date(2026, 3, 20))
        self.assertRegex(number, r"^SR-\d{8}-\d{5}$")
        self.assertTrue(number.startswith("SR-20260320-"))

    def test_first_return_is_00001(self):
        number = _generate_return_number(date(2026, 3, 20))
        self.assertEqual(number, "SR-20260320-00001")

    def test_sequential_numbers_same_day(self):
        """Each call must increment the sequence for that day."""
        day = date(2026, 3, 20)
        n1 = _generate_return_number(day)
        SalesReturn.objects.create(
            sales_invoice=self.invoice,
            return_number=n1,
            employee=self.employee,
            refund_method="cash",
            total_amount=Decimal("0"),
        )
        n2 = _generate_return_number(day)
        self.assertEqual(n1, "SR-20260320-00001")
        self.assertEqual(n2, "SR-20260320-00002")

    def test_different_days_restart_sequence(self):
        day1 = date(2026, 3, 20)
        day2 = date(2026, 3, 21)
        n1 = _generate_return_number(day1)
        SalesReturn.objects.create(
            sales_invoice=self.invoice,
            return_number=n1,
            employee=self.employee,
            refund_method="cash",
            total_amount=Decimal("0"),
        )
        n2 = _generate_return_number(day2)
        self.assertEqual(n2, "SR-20260321-00001")


# ---------------------------------------------------------------------------
# process_sales_return service
# ---------------------------------------------------------------------------

class ProcessSalesReturnTest(TestCase):
    def setUp(self):
        self.employee = make_employee()
        self.product = make_product(
            unit_price=Decimal("100.00"),
            avg_cost=Decimal("60.00"),
            quantity_on_hand=Decimal("50.000"),
        )
        self.invoice = make_invoice(self.employee, status="completed")
        self.invoice_item = make_invoice_item(
            self.invoice, self.product, 5, "100.00", "60.00"
        )

    def _do_return(self, quantity=2, refund_method="cash", **kwargs):
        return process_sales_return(
            sales_invoice_id=self.invoice.pk,
            items_data=[
                {
                    "sales_invoice_item_id": self.invoice_item.pk,
                    "quantity": quantity,
                }
            ],
            employee_id=self.employee.pk,
            refund_method=refund_method,
            return_date=date(2026, 3, 20),
            **kwargs,
        )

    # --- basic creation ---

    def test_creates_sales_return(self):
        sr = self._do_return(quantity=2)
        self.assertIsInstance(sr, SalesReturn)
        self.assertEqual(sr.sales_invoice, self.invoice)
        self.assertEqual(sr.employee, self.employee)
        self.assertEqual(sr.refund_method, "cash")

    def test_creates_sales_return_item(self):
        sr = self._do_return(quantity=2)
        items = sr.items.all()
        self.assertEqual(items.count(), 1)
        item = items.first()
        self.assertEqual(item.quantity, Decimal("2"))
        self.assertEqual(item.unit_price, Decimal("100.00"))
        self.assertEqual(item.avg_cost_snapshot, Decimal("60.00"))

    def test_total_amount_calculated(self):
        sr = self._do_return(quantity=3)
        self.assertEqual(sr.total_amount, Decimal("300.00"))

    def test_return_number_format(self):
        sr = self._do_return(quantity=1)
        self.assertRegex(sr.return_number, r"^SR-\d{8}-\d{5}$")

    # --- line_effect_on_profit ---

    def test_line_effect_on_profit_negative_when_sold_at_profit(self):
        """unit_price=100, avg_cost=60 → effect = 2*(60-100) = -80"""
        sr = self._do_return(quantity=2)
        item = sr.items.first()
        self.assertEqual(item.line_effect_on_profit, Decimal("-80.00"))

    def test_line_effect_on_profit_positive_when_sold_at_loss(self):
        """unit_price=50, avg_cost=60 → effect = 2*(60-50) = +20 (return is profitable)"""
        product = make_product(
            sku=f"SKU-LOSS-{uuid.uuid4().hex[:4]}",
            unit_price=Decimal("50.00"),
            avg_cost=Decimal("60.00"),
            quantity_on_hand=Decimal("20"),
        )
        invoice = make_invoice(self.employee)
        item = make_invoice_item(invoice, product, 5, "50.00", "60.00")
        sr = process_sales_return(
            sales_invoice_id=invoice.pk,
            items_data=[{"sales_invoice_item_id": item.pk, "quantity": 2}],
            employee_id=self.employee.pk,
            refund_method="cash",
            return_date=date(2026, 3, 20),
        )
        ri = sr.items.first()
        self.assertEqual(ri.line_effect_on_profit, Decimal("20.00"))

    # --- inventory restoration ---

    def test_inventory_qty_restored(self):
        initial_qty = self.product.quantity_on_hand  # 50
        self._do_return(quantity=3)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity_on_hand, initial_qty + Decimal("3"))

    def test_inventory_avg_cost_recalculated(self):
        """
        existing: qty=50, avg=60
        returned: qty=3, cost_snapshot=60
        new_avg = (50*60 + 3*60) / 53 = 60  (same cost, stays 60)
        """
        self._do_return(quantity=3)
        self.product.refresh_from_db()
        self.assertEqual(self.product.avg_cost, Decimal("60.00"))

    def test_inventory_avg_cost_different_snapshot(self):
        """
        existing: qty=10, avg=50, returning 5 units at snapshot=80
        new_avg = (10*50 + 5*80) / 15 = (500+400)/15 = 60.00
        """
        product = make_product(
            sku=f"SKU-AVG-{uuid.uuid4().hex[:4]}",
            unit_price=Decimal("100.00"),
            avg_cost=Decimal("50.00"),
            quantity_on_hand=Decimal("10"),
        )
        invoice = make_invoice(self.employee)
        item = make_invoice_item(invoice, product, 10, "100.00", "80.00")

        process_sales_return(
            sales_invoice_id=invoice.pk,
            items_data=[{"sales_invoice_item_id": item.pk, "quantity": 5}],
            employee_id=self.employee.pk,
            refund_method="cash",
            return_date=date(2026, 3, 20),
        )
        product.refresh_from_db()
        # (10*50 + 5*80) / 15 = 900/15 = 60
        self.assertEqual(product.avg_cost, Decimal("60.00"))
        self.assertEqual(product.quantity_on_hand, Decimal("15"))

    # --- invoice status update ---

    def test_invoice_status_partially_returned(self):
        self._do_return(quantity=2)  # 2 of 5 returned
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "partially_returned")

    def test_invoice_status_fully_returned(self):
        self._do_return(quantity=5)  # all 5 returned
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "fully_returned")

    def test_invoice_status_fully_returned_via_two_returns(self):
        self._do_return(quantity=3)  # first partial
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "partially_returned")

        process_sales_return(
            sales_invoice_id=self.invoice.pk,
            items_data=[
                {"sales_invoice_item_id": self.invoice_item.pk, "quantity": 2}
            ],
            employee_id=self.employee.pk,
            refund_method="cash",
            return_date=date(2026, 3, 20),
        )
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "fully_returned")

    # --- refund_method choices ---

    def test_refund_method_transfer(self):
        sr = self._do_return(quantity=1, refund_method="transfer")
        self.assertEqual(sr.refund_method, "transfer")

    def test_refund_method_store_credit(self):
        sr = self._do_return(quantity=1, refund_method="store_credit")
        self.assertEqual(sr.refund_method, "store_credit")

    # --- validation errors ---

    def test_raises_on_invalid_refund_method(self):
        with self.assertRaises(ValueError) as ctx:
            self._do_return(quantity=1, refund_method="bitcoin")
        self.assertIn("Invalid refund_method", str(ctx.exception))

    def test_raises_on_empty_items_data(self):
        with self.assertRaises(ValueError) as ctx:
            process_sales_return(
                sales_invoice_id=self.invoice.pk,
                items_data=[],
                employee_id=self.employee.pk,
                refund_method="cash",
            )
        self.assertIn("items_data", str(ctx.exception))

    def test_raises_when_qty_exceeds_returnable(self):
        with self.assertRaises(ValueError) as ctx:
            self._do_return(quantity=10)  # only 5 available
        self.assertIn("returnable", str(ctx.exception))

    def test_raises_when_partial_then_excess_return(self):
        self._do_return(quantity=4)  # return 4, leaves 1
        with self.assertRaises(ValueError):
            self._do_return(quantity=2)  # try to return 2 more, but only 1 left

    def test_raises_on_zero_quantity(self):
        with self.assertRaises(ValueError):
            self._do_return(quantity=0)

    def test_raises_on_negative_quantity(self):
        with self.assertRaises(ValueError):
            self._do_return(quantity=-1)
