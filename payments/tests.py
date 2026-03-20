import uuid
from decimal import Decimal

from django.test import TestCase

from payments.models import PaymentMethod, SalesPayment
from payments.services import calculate_fee


class PaymentMethodModelTest(TestCase):
    def test_create_payment_method(self):
        pm = PaymentMethod.objects.create(name="تحويل بنكي", fee_type="none")
        self.assertEqual(str(pm), "تحويل بنكي")
        self.assertIsInstance(pm.id, uuid.UUID)
        self.assertTrue(pm.is_active)

    def test_uuid_unique(self):
        pm1 = PaymentMethod.objects.create(name="طريقة 1")
        pm2 = PaymentMethod.objects.create(name="طريقة 2")
        self.assertNotEqual(pm1.id, pm2.id)

    def test_decimal_fields_not_float(self):
        pm = PaymentMethod.objects.create(
            name="اختبار",
            fee_type="both",
            fee_percentage=Decimal("1.5000"),
            fee_fixed=Decimal("2.50"),
        )
        pm.refresh_from_db()
        self.assertIsInstance(pm.fee_percentage, Decimal)
        self.assertIsInstance(pm.fee_fixed, Decimal)


class DefaultPaymentMethodsTest(TestCase):
    """Verify the data migration created all default payment methods."""

    def test_cash_method_exists(self):
        pm = PaymentMethod.objects.get(name="كاش")
        self.assertEqual(pm.fee_type, "none")

    def test_mada_method_exists(self):
        pm = PaymentMethod.objects.get(name="مدى")
        self.assertEqual(pm.fee_type, "percentage")

    def test_visa_method_exists(self):
        pm = PaymentMethod.objects.get(name="فيزا")
        self.assertEqual(pm.fee_type, "percentage")

    def test_apple_pay_method_exists(self):
        pm = PaymentMethod.objects.get(name="Apple Pay")
        self.assertEqual(pm.fee_type, "percentage")

    def test_all_four_defaults_active(self):
        names = ["كاش", "مدى", "فيزا", "Apple Pay"]
        for name in names:
            with self.subTest(name=name):
                self.assertTrue(PaymentMethod.objects.get(name=name).is_active)


class CalculateFeeTest(TestCase):
    def _pm(self, fee_type, fee_percentage=0, fee_fixed=0):
        return PaymentMethod(
            name="test",
            fee_type=fee_type,
            fee_percentage=Decimal(str(fee_percentage)),
            fee_fixed=Decimal(str(fee_fixed)),
        )

    def test_none_fee(self):
        pm = self._pm("none")
        self.assertEqual(calculate_fee(pm, Decimal("200.00")), Decimal("0.00"))

    def test_percentage_fee(self):
        pm = self._pm("percentage", fee_percentage="1.5000")
        # 200 * 1.5 / 100 = 3.00
        self.assertEqual(calculate_fee(pm, Decimal("200.00")), Decimal("3.00"))

    def test_fixed_fee(self):
        pm = self._pm("fixed", fee_fixed="5.00")
        self.assertEqual(calculate_fee(pm, Decimal("200.00")), Decimal("5.00"))

    def test_both_fee(self):
        pm = self._pm("both", fee_percentage="2.0000", fee_fixed="1.00")
        # 200 * 2 / 100 + 1 = 4 + 1 = 5.00
        self.assertEqual(calculate_fee(pm, Decimal("200.00")), Decimal("5.00"))

    def test_percentage_rounds_correctly(self):
        pm = self._pm("percentage", fee_percentage="1.5000")
        # 100 * 1.5 / 100 = 1.50
        self.assertEqual(calculate_fee(pm, Decimal("100.00")), Decimal("1.50"))

    def test_zero_amount(self):
        pm = self._pm("percentage", fee_percentage="2.5000")
        self.assertEqual(calculate_fee(pm, Decimal("0.00")), Decimal("0.00"))


class SalesPaymentModelTest(TestCase):
    def setUp(self):
        self.pm = PaymentMethod.objects.create(
            name="اختبار", fee_type="none"
        )

    def test_create_sales_payment(self):
        invoice_id = uuid.uuid4()
        sp = SalesPayment.objects.create(
            invoice_id=invoice_id,
            payment_method=self.pm,
            amount=Decimal("150.00"),
            fee_amount=Decimal("0.00"),
        )
        self.assertEqual(sp.invoice_id, invoice_id)
        self.assertEqual(sp.amount, Decimal("150.00"))
        self.assertIsInstance(sp.id, uuid.UUID)

    def test_decimal_amount_not_float(self):
        sp = SalesPayment.objects.create(
            payment_method=self.pm,
            amount=Decimal("99.99"),
            fee_amount=Decimal("1.50"),
        )
        sp.refresh_from_db()
        self.assertIsInstance(sp.amount, Decimal)
        self.assertIsInstance(sp.fee_amount, Decimal)

    def test_str_representation(self):
        sp = SalesPayment.objects.create(
            payment_method=self.pm,
            amount=Decimal("50.00"),
            fee_amount=Decimal("0.00"),
        )
        self.assertIn("اختبار", str(sp))
        self.assertIn("50.00", str(sp))
