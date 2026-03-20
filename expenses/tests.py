import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase

from .models import Expense, ExpenseCategory
from .services import get_total_expenses


# ---------------------------------------------------------------------------
# ExpenseCategory tests
# ---------------------------------------------------------------------------


class ExpenseCategoryModelTest(TestCase):
    def setUp(self):
        # "إيجار" is already created by the data migration; use get_or_create to avoid collision.
        self.category, _ = ExpenseCategory.objects.get_or_create(
            name="إيجار", defaults={"is_system": True}
        )

    def test_created_with_uuid(self):
        self.assertIsInstance(self.category.id, uuid.UUID)

    def test_str(self):
        self.assertEqual(str(self.category), "إيجار")

    def test_is_active_default_true(self):
        self.assertTrue(self.category.is_active)

    def test_has_timestamps(self):
        self.assertIsNotNone(self.category.created_at)
        self.assertIsNotNone(self.category.updated_at)

    def test_is_system_flag(self):
        self.assertTrue(self.category.is_system)

    def test_is_system_default_false(self):
        cat = ExpenseCategory.objects.create(name="متنوع")
        self.assertFalse(cat.is_system)

    def test_name_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            ExpenseCategory.objects.create(name="إيجار")

    def test_soft_delete(self):
        self.category.is_active = False
        self.category.save()
        self.assertFalse(ExpenseCategory.objects.get(pk=self.category.pk).is_active)


class ExpenseCategoryDefaultsTest(TestCase):
    """Verify that the data migration created the 10 system categories."""

    EXPECTED_NAMES = [
        "إيجار",
        "كهرباء",
        "ماء",
        "إنترنت",
        "رواتب",
        "صيانة",
        "تسويق",
        "رسوم بنكية",
        "رسوم بوابات دفع",
        "أخرى",
    ]

    def test_all_system_categories_exist(self):
        for name in self.EXPECTED_NAMES:
            self.assertTrue(
                ExpenseCategory.objects.filter(name=name, is_system=True).exists(),
                msg=f"System category '{name}' not found.",
            )

    def test_system_category_count(self):
        self.assertEqual(
            ExpenseCategory.objects.filter(is_system=True).count(),
            len(self.EXPECTED_NAMES),
        )


# ---------------------------------------------------------------------------
# Expense model tests
# ---------------------------------------------------------------------------


class ExpenseModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cashier", password="pass")
        self.category, _ = ExpenseCategory.objects.get_or_create(
            name="كهرباء", defaults={"is_system": True}
        )
        self.expense = Expense.objects.create(
            category=self.category,
            amount=Decimal("350.00"),
            expense_date=date(2026, 1, 15),
            notes="فاتورة يناير",
            created_by=self.user,
        )

    def test_created_with_uuid(self):
        self.assertIsInstance(self.expense.id, uuid.UUID)

    def test_str(self):
        s = str(self.expense)
        self.assertIn("كهرباء", s)
        self.assertIn("350.00", s)
        self.assertIn("2026-01-15", s)

    def test_is_active_default_true(self):
        self.assertTrue(self.expense.is_active)

    def test_has_timestamps(self):
        self.assertIsNotNone(self.expense.created_at)
        self.assertIsNotNone(self.expense.updated_at)

    def test_amount_is_decimal(self):
        self.assertIsInstance(self.expense.amount, Decimal)

    def test_created_by_fk(self):
        self.assertEqual(self.expense.created_by, self.user)

    def test_category_fk(self):
        self.assertEqual(self.expense.category, self.category)

    def test_soft_delete(self):
        self.expense.is_active = False
        self.expense.save()
        self.assertFalse(Expense.objects.get(pk=self.expense.pk).is_active)

    def test_category_protect_on_delete(self):
        """Deleting a category that has expenses must raise ProtectedError."""
        from django.db.models import ProtectedError

        with self.assertRaises(ProtectedError):
            self.category.delete()

    def test_created_by_null_when_user_deleted(self):
        """Expense persists with NULL created_by after the user is deleted."""
        self.user.delete()
        self.expense.refresh_from_db()
        self.assertIsNone(self.expense.created_by)

    def test_notes_optional(self):
        expense = Expense.objects.create(
            category=self.category,
            amount=Decimal("100.00"),
            expense_date=date(2026, 2, 1),
        )
        self.assertEqual(expense.notes, "")


# ---------------------------------------------------------------------------
# Service: get_total_expenses
# ---------------------------------------------------------------------------


class GetTotalExpensesServiceTest(TestCase):
    def setUp(self):
        self.cat, _ = ExpenseCategory.objects.get_or_create(
            name="صيانة", defaults={"is_system": True}
        )

    def _expense(self, amount, expense_date, is_active=True):
        return Expense.objects.create(
            category=self.cat,
            amount=Decimal(str(amount)),
            expense_date=expense_date,
            is_active=is_active,
        )

    def test_returns_decimal(self):
        self._expense("200.00", date(2026, 1, 10))
        result = get_total_expenses(date(2026, 1, 1), date(2026, 1, 31))
        self.assertIsInstance(result, Decimal)

    def test_sum_within_range(self):
        self._expense("200.00", date(2026, 1, 10))
        self._expense("150.00", date(2026, 1, 25))
        result = get_total_expenses(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(result, Decimal("350.00"))

    def test_excludes_outside_range(self):
        self._expense("200.00", date(2026, 1, 10))
        self._expense("500.00", date(2026, 2, 5))  # outside range
        result = get_total_expenses(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(result, Decimal("200.00"))

    def test_excludes_inactive_expenses(self):
        self._expense("200.00", date(2026, 1, 10))
        self._expense("999.00", date(2026, 1, 20), is_active=False)
        result = get_total_expenses(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(result, Decimal("200.00"))

    def test_returns_zero_when_no_expenses(self):
        result = get_total_expenses(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(result, Decimal("0.00"))

    def test_inclusive_boundary_dates(self):
        self._expense("100.00", date(2026, 1, 1))   # start boundary
        self._expense("200.00", date(2026, 1, 31))  # end boundary
        result = get_total_expenses(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(result, Decimal("300.00"))


# ---------------------------------------------------------------------------
# Service: get_profitability_report (mocked Invoice model)
# ---------------------------------------------------------------------------


class GetProfitabilityReportServiceTest(TestCase):
    def setUp(self):
        self.cat, _ = ExpenseCategory.objects.get_or_create(
            name="تسويق", defaults={"is_system": True}
        )
        Expense.objects.create(
            category=self.cat,
            amount=Decimal("300.00"),
            expense_date=date(2026, 1, 15),
        )

    def _mock_invoice_model(self, gross_revenue, gross_profit, payment_fees):
        """Build a mock Invoice model whose objects.filter().aggregate() returns given values."""
        mock_qs = MagicMock()
        mock_qs.aggregate.return_value = {
            "_gross_revenue": Decimal(str(gross_revenue)),
            "_gross_profit": Decimal(str(gross_profit)),
            "_payment_fees": Decimal(str(payment_fees)),
        }
        mock_model = MagicMock()
        mock_model.objects.filter.return_value = mock_qs
        return mock_model

    def test_report_keys(self):
        mock_invoice = self._mock_invoice_model("10000", "4000", "150")
        with patch("expenses.services.apps.get_model", return_value=mock_invoice):
            from expenses.services import get_profitability_report
            report = get_profitability_report(date(2026, 1, 1), date(2026, 1, 31))

        expected_keys = {
            "gross_revenue",
            "gross_profit",
            "payment_fees",
            "net_revenue",
            "total_expenses",
            "net_operating_profit",
        }
        self.assertEqual(set(report.keys()), expected_keys)

    def test_calculations(self):
        mock_invoice = self._mock_invoice_model("10000", "4000", "150")
        with patch("expenses.services.apps.get_model", return_value=mock_invoice):
            from expenses.services import get_profitability_report
            report = get_profitability_report(date(2026, 1, 1), date(2026, 1, 31))

        self.assertEqual(report["gross_revenue"], Decimal("10000"))
        self.assertEqual(report["gross_profit"], Decimal("4000"))
        self.assertEqual(report["payment_fees"], Decimal("150"))
        self.assertEqual(report["net_revenue"], Decimal("9850"))    # 10000 - 150
        self.assertEqual(report["total_expenses"], Decimal("300"))
        self.assertEqual(report["net_operating_profit"], Decimal("3700"))  # 4000 - 300

    def test_zero_invoices(self):
        mock_invoice = self._mock_invoice_model("0", "0", "0")
        mock_qs = MagicMock()
        mock_qs.aggregate.return_value = {
            "_gross_revenue": None,
            "_gross_profit": None,
            "_payment_fees": None,
        }
        mock_invoice.objects.filter.return_value = mock_qs

        with patch("expenses.services.apps.get_model", return_value=mock_invoice):
            from expenses.services import get_profitability_report
            report = get_profitability_report(date(2026, 1, 1), date(2026, 1, 31))

        self.assertEqual(report["gross_revenue"], Decimal("0.00"))
        self.assertEqual(report["net_operating_profit"], Decimal("-300.00"))
