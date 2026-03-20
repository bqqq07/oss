import uuid
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from products.models import Product
from .models import InventoryBalance, InventoryMovement


class InventoryBalanceModelTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(name="Test Product", sku="TEST-001")
        self.balance = InventoryBalance.objects.create(
            product=self.product,
            quantity_on_hand=Decimal("100.000"),
            quantity_reserved=Decimal("10.000"),
        )

    def test_balance_created_with_uuid(self):
        self.assertIsInstance(self.balance.id, uuid.UUID)

    def test_balance_str(self):
        self.assertIn("Test Product", str(self.balance))
        self.assertIn("100.000", str(self.balance))

    def test_balance_is_active_default_true(self):
        self.assertTrue(self.balance.is_active)

    def test_balance_has_timestamps(self):
        self.assertIsNotNone(self.balance.created_at)
        self.assertIsNotNone(self.balance.updated_at)

    def test_balance_quantity_on_hand_is_decimal(self):
        self.assertIsInstance(self.balance.quantity_on_hand, Decimal)

    def test_balance_quantity_reserved_is_decimal(self):
        self.assertIsInstance(self.balance.quantity_reserved, Decimal)

    def test_balance_quantity_available_property(self):
        self.assertEqual(self.balance.quantity_available, Decimal("90.000"))

    def test_balance_one_to_one_product(self):
        self.assertEqual(self.balance.product, self.product)
        self.assertEqual(self.product.inventory_balance, self.balance)

    def test_balance_one_product_one_balance(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            InventoryBalance.objects.create(
                product=self.product,
                quantity_on_hand=Decimal("50.000"),
            )

    def test_balance_soft_delete(self):
        self.balance.is_active = False
        self.balance.save()
        self.assertFalse(InventoryBalance.objects.get(pk=self.balance.pk).is_active)


class InventoryMovementModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="warehouse", password="pass")
        self.product = Product.objects.create(name="Widget", sku="WDG-001")
        self.movement = InventoryMovement.objects.create(
            product=self.product,
            movement_type="in",
            quantity=Decimal("50.000"),
            unit_cost=Decimal("25.50"),
            reference="PO-2024-001",
            moved_by=self.user,
        )

    def test_movement_created_with_uuid(self):
        self.assertIsInstance(self.movement.id, uuid.UUID)

    def test_movement_str(self):
        self.assertIn("Stock In", str(self.movement))
        self.assertIn("Widget", str(self.movement))
        self.assertIn("50.000", str(self.movement))

    def test_movement_is_active_default_true(self):
        self.assertTrue(self.movement.is_active)

    def test_movement_has_timestamps(self):
        self.assertIsNotNone(self.movement.created_at)
        self.assertIsNotNone(self.movement.updated_at)

    def test_movement_quantity_is_decimal(self):
        self.assertIsInstance(self.movement.quantity, Decimal)

    def test_movement_unit_cost_is_decimal(self):
        self.assertIsInstance(self.movement.unit_cost, Decimal)

    def test_movement_product_relation(self):
        self.assertEqual(self.movement.product, self.product)
        self.assertIn(self.movement, self.product.inventory_movements.all())

    def test_movement_moved_by_relation(self):
        self.assertEqual(self.movement.moved_by, self.user)

    def test_movement_type_choices(self):
        for code, _ in InventoryMovement.MOVEMENT_TYPES:
            m = InventoryMovement.objects.create(
                product=self.product,
                movement_type=code,
                quantity=Decimal("1.000"),
            )
            self.assertEqual(m.movement_type, code)

    def test_movement_soft_delete(self):
        self.movement.is_active = False
        self.movement.save()
        self.assertFalse(InventoryMovement.objects.get(pk=self.movement.pk).is_active)
