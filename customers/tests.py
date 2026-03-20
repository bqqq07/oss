import uuid

from django.test import TestCase

from core.models import Settings
from customers.models import Customer


class CustomerModelTest(TestCase):
    def test_create_customer(self):
        customer = Customer.objects.create(full_name="فاطمة علي")
        self.assertEqual(str(customer), "فاطمة علي")
        self.assertIsInstance(customer.id, uuid.UUID)
        self.assertTrue(customer.is_active)
        self.assertFalse(customer.is_system)
        self.assertEqual(customer.loyalty_points, 0)
        self.assertFalse(customer.marketing_opt_in)

    def test_soft_delete_via_is_active(self):
        customer = Customer.objects.create(full_name="محمد أحمد")
        customer.is_active = False
        customer.save()
        self.assertFalse(Customer.objects.get(pk=customer.pk).is_active)

    def test_uuid_is_unique(self):
        c1 = Customer.objects.create(full_name="عميل 1")
        c2 = Customer.objects.create(full_name="عميل 2")
        self.assertNotEqual(c1.id, c2.id)

    def test_created_at_and_updated_at_auto_set(self):
        customer = Customer.objects.create(full_name="عميل اختبار")
        self.assertIsNotNone(customer.created_at)
        self.assertIsNotNone(customer.updated_at)

    def test_gender_choices(self):
        customer = Customer.objects.create(full_name="ريم", gender="female")
        self.assertEqual(customer.gender, "female")


class DefaultCashCustomerTest(TestCase):
    """Verify the data migration created the default cash customer."""

    def test_cash_customer_exists(self):
        cash_customer = Customer.objects.filter(
            full_name="عميل نقدي", is_system=True
        ).first()
        self.assertIsNotNone(cash_customer)

    def test_cash_customer_id_stored_in_settings(self):
        cash_customer = Customer.objects.get(full_name="عميل نقدي", is_system=True)
        setting = Settings.objects.get(key="cash_customer_id")
        self.assertEqual(setting.value, str(cash_customer.id))

    def test_cash_customer_is_active(self):
        cash_customer = Customer.objects.get(full_name="عميل نقدي", is_system=True)
        self.assertTrue(cash_customer.is_active)
