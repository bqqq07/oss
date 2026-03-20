"""
Tests for the sales app — ROLE-05.

Covers:
  - Customer model
  - Product stub model
  - Shift model
  - SalesInvoice model (incl. invoice_no generation)
  - SalesInvoiceItem model
  - CashMovement model
  - ZATCA QR generator / decoder (sales.zatca)
"""

import base64
import uuid
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from core.models import Device, Employee
from sales.models import (
    CashMovement,
    Customer,
    Product,
    SalesInvoice,
    SalesInvoiceItem,
    Shift,
)
from sales.zatca import decode_zatca_qr, generate_zatca_qr


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

def make_user(username: str) -> User:
    return User.objects.create_user(username=username, password="pass")


def make_employee(full_name: str, email: str, user: User) -> Employee:
    return Employee.objects.create(full_name=full_name, email=email, user=user)


def make_device(name: str, serial: str) -> Device:
    return Device.objects.create(name=name, serial_number=serial)


def make_shift(employee: Employee, device: Device, **kwargs) -> Shift:
    defaults = dict(
        employee=employee,
        device=device,
        opened_at=timezone.now(),
        opening_cash=Decimal("500.00"),
    )
    defaults.update(kwargs)
    return Shift.objects.create(**defaults)


def make_invoice(shift: Shift, employee: Employee, **kwargs) -> SalesInvoice:
    defaults = dict(
        shift=shift,
        employee=employee,
        sold_at=timezone.now(),
        subtotal=Decimal("100.00"),
        vat_amount=Decimal("15.00"),
        total=Decimal("115.00"),
    )
    defaults.update(kwargs)
    return SalesInvoice.objects.create(**defaults)


# ---------------------------------------------------------------------------
# CustomerModelTest
# ---------------------------------------------------------------------------

class CustomerModelTest(TestCase):

    def test_create_with_all_fields(self):
        c = Customer.objects.create(
            name="أحمد محمد",
            phone="0501234567",
            email="ahmed@example.com",
        )
        self.assertTrue(c.is_active)
        self.assertIsInstance(c.id, uuid.UUID)
        self.assertIsNotNone(c.created_at)
        self.assertIsNotNone(c.updated_at)

    def test_str(self):
        c = Customer.objects.create(name="فاطمة")
        self.assertEqual(str(c), "فاطمة")

    def test_optional_fields_default_empty(self):
        c = Customer.objects.create(name="Walk-in")
        self.assertEqual(c.phone, "")
        self.assertEqual(c.email, "")

    def test_soft_delete_flag(self):
        c = Customer.objects.create(name="Inactive Customer")
        c.is_active = False
        c.save()
        self.assertFalse(Customer.objects.get(pk=c.pk).is_active)


# ---------------------------------------------------------------------------
# ProductModelTest
# ---------------------------------------------------------------------------

class ProductModelTest(TestCase):

    def test_create_product(self):
        p = Product.objects.create(name="كريم مرطب", sku="CRM-001")
        self.assertIsInstance(p.id, uuid.UUID)
        self.assertTrue(p.is_active)

    def test_str(self):
        p = Product.objects.create(name="عطر", sku="ATR-002")
        self.assertIn("ATR-002", str(p))
        self.assertIn("عطر", str(p))

    def test_sku_unique(self):
        Product.objects.create(name="A", sku="SAME-SKU")
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Product.objects.create(name="B", sku="SAME-SKU")


# ---------------------------------------------------------------------------
# ShiftModelTest
# ---------------------------------------------------------------------------

class ShiftModelTest(TestCase):

    def setUp(self):
        self.employee = make_employee("محمد علي", "m@test.com", make_user("u1"))
        self.device = make_device("POS-1", "SN-001")

    def test_create_open_shift(self):
        shift = make_shift(self.employee, self.device)
        self.assertEqual(shift.status, Shift.STATUS_OPEN)
        self.assertIsNone(shift.closed_at)
        self.assertIsNone(shift.closing_cash_actual)
        self.assertIsInstance(shift.id, uuid.UUID)

    def test_close_shift(self):
        shift = make_shift(self.employee, self.device, closing_cash_expected=Decimal("850.00"))
        shift.closing_cash_actual = Decimal("845.00")
        shift.closed_at = timezone.now()
        shift.status = Shift.STATUS_CLOSED
        shift.save()
        shift.refresh_from_db()
        self.assertEqual(shift.status, "closed")
        self.assertEqual(shift.closing_cash_actual, Decimal("845.00"))
        self.assertIsNotNone(shift.closed_at)

    def test_suspend_shift(self):
        shift = make_shift(self.employee, self.device)
        shift.status = Shift.STATUS_SUSPENDED
        shift.save()
        self.assertEqual(Shift.objects.get(pk=shift.pk).status, "suspended")

    def test_decimal_fields_not_float(self):
        for field in Shift._meta.get_fields():
            if hasattr(field, "get_internal_type"):
                self.assertNotEqual(
                    field.get_internal_type(),
                    "FloatField",
                    msg=f"FloatField found on Shift.{field.name} — must be DecimalField",
                )

    def test_str_contains_status(self):
        shift = make_shift(self.employee, self.device)
        self.assertIn("open", str(shift))

    def test_uuid_primary_key(self):
        shift = make_shift(self.employee, self.device)
        self.assertIsInstance(shift.id, uuid.UUID)


# ---------------------------------------------------------------------------
# SalesInvoiceModelTest
# ---------------------------------------------------------------------------

class SalesInvoiceModelTest(TestCase):

    def setUp(self):
        self.employee = make_employee("سارة أحمد", "s@test.com", make_user("u2"))
        self.device = make_device("POS-2", "SN-002")
        self.shift = make_shift(self.employee, self.device)
        self.customer = Customer.objects.create(name="عميل اختبار")

    # -- invoice_no generation ---

    def test_invoice_no_format(self):
        inv = make_invoice(self.shift, self.employee)
        parts = inv.invoice_no.split("-")
        self.assertEqual(parts[0], "INV")
        self.assertEqual(len(parts[1]), 8)          # YYYYMMDD
        self.assertTrue(parts[1].isdigit())
        self.assertEqual(len(parts[2]), 5)          # XXXXX
        self.assertTrue(parts[2].isdigit())

    def test_invoice_no_auto_generated(self):
        inv = make_invoice(self.shift, self.employee)
        self.assertTrue(inv.invoice_no.startswith("INV-"))

    def test_invoice_no_first_of_day_is_00001(self):
        inv = make_invoice(self.shift, self.employee)
        seq = int(inv.invoice_no.split("-")[-1])
        self.assertEqual(seq, 1)

    def test_invoice_no_sequential(self):
        inv1 = make_invoice(self.shift, self.employee)
        inv2 = make_invoice(self.shift, self.employee)
        seq1 = int(inv1.invoice_no.split("-")[-1])
        seq2 = int(inv2.invoice_no.split("-")[-1])
        self.assertEqual(seq2, seq1 + 1)

    def test_invoice_no_zero_padded(self):
        inv = make_invoice(self.shift, self.employee)
        self.assertEqual(len(inv.invoice_no.split("-")[-1]), 5)

    def test_invoice_no_not_overwritten_on_resave(self):
        inv = make_invoice(self.shift, self.employee)
        original_no = inv.invoice_no
        inv.status = SalesInvoice.STATUS_CANCELLED
        inv.save()
        self.assertEqual(inv.invoice_no, original_no)

    # -- status / sync_status ---

    def test_default_status_completed(self):
        inv = make_invoice(self.shift, self.employee)
        self.assertEqual(inv.status, "completed")

    def test_default_sync_status_pending(self):
        inv = make_invoice(self.shift, self.employee)
        self.assertEqual(inv.sync_status, "pending")

    def test_all_status_choices(self):
        for status in ["completed", "partially_returned", "fully_returned", "cancelled"]:
            inv = make_invoice(self.shift, self.employee, status=status)
            self.assertEqual(SalesInvoice.objects.get(pk=inv.pk).status, status)

    def test_all_sync_status_choices(self):
        for sync in ["pending", "synced", "failed"]:
            inv = make_invoice(self.shift, self.employee, sync_status=sync)
            self.assertEqual(SalesInvoice.objects.get(pk=inv.pk).sync_status, sync)

    # -- relations ---

    def test_customer_optional(self):
        inv = make_invoice(self.shift, self.employee, customer=None)
        self.assertIsNone(inv.customer)

    def test_customer_linked(self):
        inv = make_invoice(self.shift, self.employee, customer=self.customer)
        self.assertEqual(SalesInvoice.objects.get(pk=inv.pk).customer, self.customer)

    def test_shift_relation(self):
        inv = make_invoice(self.shift, self.employee)
        self.assertEqual(inv.shift, self.shift)
        self.assertIn(inv, self.shift.invoices.all())

    # -- field constraints ---

    def test_decimal_fields_not_float(self):
        money_fields = [
            "subtotal", "discount_amount", "vat_amount", "total",
            "payment_fees", "net_revenue", "estimated_cost", "gross_profit",
        ]
        for name in money_fields:
            field = SalesInvoice._meta.get_field(name)
            self.assertEqual(
                field.get_internal_type(),
                "DecimalField",
                msg=f"SalesInvoice.{name} must be DecimalField, not FloatField",
            )

    def test_str(self):
        inv = make_invoice(self.shift, self.employee)
        self.assertEqual(str(inv), inv.invoice_no)

    def test_uuid_primary_key(self):
        inv = make_invoice(self.shift, self.employee)
        self.assertIsInstance(inv.id, uuid.UUID)

    def test_is_active_soft_delete(self):
        inv = make_invoice(self.shift, self.employee)
        inv.is_active = False
        inv.save()
        self.assertFalse(SalesInvoice.objects.get(pk=inv.pk).is_active)


# ---------------------------------------------------------------------------
# SalesInvoiceItemModelTest
# ---------------------------------------------------------------------------

class SalesInvoiceItemModelTest(TestCase):

    def setUp(self):
        self.employee = make_employee("خالد سعد", "k@test.com", make_user("u3"))
        self.device = make_device("POS-3", "SN-003")
        self.shift = make_shift(self.employee, self.device)
        self.invoice = make_invoice(self.shift, self.employee)
        self.product = Product.objects.create(name="شامبو", sku="SH-001")

    def _make_item(self, **kwargs):
        defaults = dict(
            invoice=self.invoice,
            quantity=Decimal("2.000"),
            unit_price=Decimal("50.00"),
            line_total=Decimal("100.00"),
        )
        defaults.update(kwargs)
        return SalesInvoiceItem.objects.create(**defaults)

    def test_create_item_with_product(self):
        item = self._make_item(product=self.product)
        self.assertEqual(item.product, self.product)
        self.assertEqual(item.quantity, Decimal("2.000"))
        self.assertEqual(item.unit_price, Decimal("50.00"))
        self.assertEqual(item.line_total, Decimal("100.00"))

    def test_create_item_without_product(self):
        item = self._make_item(product=None)
        self.assertIsNone(item.product)

    def test_item_belongs_to_invoice(self):
        item = self._make_item()
        self.assertIn(item, self.invoice.items.all())

    def test_uuid_primary_key(self):
        item = self._make_item()
        self.assertIsInstance(item.id, uuid.UUID)

    def test_decimal_fields_precision(self):
        item = self._make_item(
            avg_cost_snapshot=Decimal("12.3456"),
            line_profit=Decimal("25.00"),
        )
        self.assertEqual(item.avg_cost_snapshot, Decimal("12.3456"))

    def test_discount_and_vat_defaults(self):
        item = self._make_item()
        self.assertEqual(item.discount_amount, Decimal("0"))
        self.assertEqual(item.vat_amount, Decimal("0"))

    def test_cascade_delete_with_invoice(self):
        self._make_item()
        self._make_item(quantity=Decimal("1.000"), unit_price=Decimal("200.00"), line_total=Decimal("200.00"))
        item_count_before = SalesInvoiceItem.objects.count()
        self.invoice.delete()
        self.assertEqual(SalesInvoiceItem.objects.count(), 0)

    def test_decimal_fields_not_float(self):
        for field in SalesInvoiceItem._meta.get_fields():
            if hasattr(field, "get_internal_type"):
                self.assertNotEqual(
                    field.get_internal_type(),
                    "FloatField",
                    msg=f"FloatField found on SalesInvoiceItem.{field.name}",
                )


# ---------------------------------------------------------------------------
# CashMovementModelTest
# ---------------------------------------------------------------------------

class CashMovementModelTest(TestCase):

    def setUp(self):
        self.employee = make_employee("منير حسن", "mn@test.com", make_user("u4"))
        self.device = make_device("POS-4", "SN-004")
        self.shift = make_shift(self.employee, self.device)

    def _make_movement(self, movement_type="cash_in", amount=Decimal("100.00"), **kwargs):
        defaults = dict(
            shift=self.shift,
            movement_type=movement_type,
            amount=amount,
            created_by=self.employee,
        )
        defaults.update(kwargs)
        return CashMovement.objects.create(**defaults)

    def test_create_cash_in(self):
        mv = self._make_movement("cash_in", Decimal("200.00"), reason="Additional float")
        self.assertEqual(mv.movement_type, "cash_in")
        self.assertEqual(mv.amount, Decimal("200.00"))
        self.assertEqual(mv.reason, "Additional float")

    def test_create_cash_out(self):
        mv = self._make_movement("cash_out", Decimal("50.00"))
        self.assertEqual(mv.movement_type, "cash_out")

    def test_all_movement_types(self):
        for mt in ["cash_in", "cash_out", "sale", "refund"]:
            mv = self._make_movement(mt, Decimal("10.00"))
            self.assertEqual(mv.movement_type, mt)

    def test_uuid_primary_key(self):
        mv = self._make_movement()
        self.assertIsInstance(mv.id, uuid.UUID)

    def test_reason_optional(self):
        mv = self._make_movement()
        self.assertEqual(mv.reason, "")

    def test_created_by_relation(self):
        mv = self._make_movement()
        self.assertEqual(mv.created_by, self.employee)

    def test_shift_relation(self):
        mv = self._make_movement()
        self.assertIn(mv, self.shift.cash_movements.all())

    def test_decimal_field(self):
        mv = self._make_movement(amount=Decimal("999.99"))
        self.assertEqual(CashMovement.objects.get(pk=mv.pk).amount, Decimal("999.99"))

    def test_is_active_and_timestamps(self):
        mv = self._make_movement()
        self.assertTrue(mv.is_active)
        self.assertIsNotNone(mv.created_at)
        self.assertIsNotNone(mv.updated_at)


# ---------------------------------------------------------------------------
# ZatcaQrTest
# ---------------------------------------------------------------------------

class ZatcaQrTest(TestCase):

    SELLER = "شركة الجمال للعناية"
    VAT_NO = "310122393500003"
    DATE = datetime(2024, 3, 15, 10, 30, 0, tzinfo=dt_timezone.utc)
    TOTAL = Decimal("115.00")
    VAT = Decimal("15.00")

    def _qr(self, **kwargs):
        params = dict(
            seller_name=self.SELLER,
            vat_number=self.VAT_NO,
            invoice_date=self.DATE,
            total_with_vat=self.TOTAL,
            vat_amount=self.VAT,
        )
        params.update(kwargs)
        return generate_zatca_qr(**params)

    def test_returns_string(self):
        self.assertIsInstance(self._qr(), str)

    def test_valid_base64(self):
        qr = self._qr()
        try:
            base64.b64decode(qr)
        except Exception as exc:
            self.fail(f"generate_zatca_qr returned invalid base64: {exc}")

    def test_decode_round_trip(self):
        qr = self._qr()
        result = decode_zatca_qr(qr)
        self.assertEqual(result["seller_name"], self.SELLER)
        self.assertEqual(result["vat_number"], self.VAT_NO)
        self.assertEqual(result["timestamp"], "2024-03-15T10:30:00Z")
        self.assertEqual(result["total_with_vat"], "115.00")
        self.assertEqual(result["vat_amount"], "15.00")

    def test_first_tlv_tag_is_1(self):
        qr = self._qr()
        raw = base64.b64decode(qr)
        self.assertEqual(raw[0], 1, "First TLV tag must be 1 (seller name)")

    def test_five_tlv_tags_present(self):
        result = decode_zatca_qr(self._qr())
        self.assertEqual(
            set(result.keys()),
            {"seller_name", "vat_number", "timestamp", "total_with_vat", "vat_amount"},
        )

    def test_arabic_seller_name(self):
        qr = generate_zatca_qr(
            seller_name="متجر العود",
            vat_number="310000000000003",
            invoice_date=self.DATE,
            total_with_vat=Decimal("230.00"),
            vat_amount=Decimal("30.00"),
        )
        result = decode_zatca_qr(qr)
        self.assertEqual(result["seller_name"], "متجر العود")

    def test_zero_vat(self):
        qr = self._qr(vat_amount=Decimal("0.00"))
        result = decode_zatca_qr(qr)
        self.assertEqual(result["vat_amount"], "0.00")

    def test_large_total(self):
        qr = self._qr(total_with_vat=Decimal("99999.99"), vat_amount=Decimal("13043.47"))
        result = decode_zatca_qr(qr)
        self.assertEqual(result["total_with_vat"], "99999.99")

    def test_timestamp_format(self):
        qr = self._qr()
        result = decode_zatca_qr(qr)
        # Must be ISO 8601 UTC format
        ts = result["timestamp"]
        self.assertRegex(ts, r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

    def test_value_too_long_raises(self):
        from sales.zatca import _tlv
        with self.assertRaises(ValueError):
            _tlv(1, "x" * 256)
