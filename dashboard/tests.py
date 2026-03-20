import json
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone

from core.models import Employee
from expenses.models import Expense, ExpenseCategory
from inventory.models import Branch, Category, Product
from payments.models import PaymentMethod
from sales.models import Return, Sale, SaleItem, SalePayment, Shift


def create_base_data():
    """Create shared test fixtures."""
    user = User.objects.create_user(username="emp1", password="pass")
    employee = Employee.objects.create(
        full_name="Test Employee",
        email="emp1@test.com",
        salary=Decimal("3000.00"),
        user=user,
    )
    branch = Branch.objects.create(name="Main Branch")
    category = Category.objects.create(name="Skin Care")
    product = Product.objects.create(
        name="Moisturizer",
        sku="SKU001",
        category=category,
        cost_price=Decimal("50.00"),
        selling_price=Decimal("100.00"),
        min_stock=10,
        current_stock=5,
    )
    payment_cash = PaymentMethod.objects.create(
        name="Cash", fee_percentage=Decimal("0.00"), is_cash=True
    )
    payment_card = PaymentMethod.objects.create(
        name="Credit Card", fee_percentage=Decimal("2.50")
    )
    return employee, branch, category, product, payment_cash, payment_card


def create_sale(employee, branch, product, payment_method, amount, cost):
    sale = Sale.objects.create(
        sale_number=f"SALE-{Sale.objects.count() + 1:04d}",
        employee=employee,
        branch=branch,
        subtotal=amount,
        discount_amount=Decimal("0.00"),
        final_amount=amount,
    )
    SaleItem.objects.create(
        sale=sale,
        product=product,
        quantity=1,
        unit_price=amount,
        cost_price=cost,
        total_price=amount,
    )
    SalePayment.objects.create(
        sale=sale,
        payment_method=payment_method,
        amount=amount,
    )
    return sale


class OwnerDashboardViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/dashboard/owner/"
        (
            self.employee,
            self.branch,
            self.category,
            self.product,
            self.payment_cash,
            self.payment_card,
        ) = create_base_data()

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        response = self.client.get(self.url)
        data = response.json()
        self.assertIn("success", data)
        self.assertIn("data", data)
        self.assertIn("message", data)
        self.assertIn("errors", data)
        self.assertTrue(data["success"])

    def test_data_sections_present(self):
        response = self.client.get(self.url)
        body = response.json()["data"]
        self.assertIn("sales", body)
        self.assertIn("profitability", body)
        self.assertIn("payment_fees", body)
        self.assertIn("top_products", body)
        self.assertIn("low_stock_products", body)
        self.assertIn("dormant_products", body)
        self.assertIn("employee_performance", body)
        self.assertIn("payment_distribution", body)

    def test_sales_periods(self):
        response = self.client.get(self.url)
        sales = response.json()["data"]["sales"]
        self.assertIn("today", sales)
        self.assertIn("week", sales)
        self.assertIn("month", sales)

    def test_amounts_are_strings(self):
        create_sale(
            self.employee,
            self.branch,
            self.product,
            self.payment_cash,
            Decimal("100.00"),
            Decimal("50.00"),
        )
        response = self.client.get(self.url)
        body = response.json()["data"]
        # Revenue should be a string
        self.assertIsInstance(body["sales"]["today"]["revenue"], str)
        self.assertIsInstance(body["profitability"]["gross_profit"], str)
        self.assertIsInstance(body["profitability"]["net_operating_profit"], str)

    def test_low_stock_products_detected(self):
        # product has current_stock=5, min_stock=10 → below min
        response = self.client.get(self.url)
        low_stock = response.json()["data"]["low_stock_products"]
        self.assertEqual(len(low_stock), 1)
        self.assertEqual(low_stock[0]["sku"], "SKU001")

    def test_dormant_products_detected(self):
        # No sales → product is dormant
        response = self.client.get(self.url)
        dormant = response.json()["data"]["dormant_products"]
        skus = [p["sku"] for p in dormant]
        self.assertIn("SKU001", skus)

    def test_top_products_populated(self):
        create_sale(
            self.employee,
            self.branch,
            self.product,
            self.payment_cash,
            Decimal("100.00"),
            Decimal("50.00"),
        )
        response = self.client.get(self.url)
        top = response.json()["data"]["top_products"]
        self.assertGreaterEqual(len(top), 1)
        self.assertEqual(top[0]["sku"], "SKU001")

    def test_employee_performance_populated(self):
        create_sale(
            self.employee,
            self.branch,
            self.product,
            self.payment_cash,
            Decimal("200.00"),
            Decimal("100.00"),
        )
        response = self.client.get(self.url)
        perf = response.json()["data"]["employee_performance"]
        self.assertEqual(len(perf), 1)
        self.assertEqual(perf[0]["full_name"], "Test Employee")

    def test_payment_distribution_populated(self):
        create_sale(
            self.employee,
            self.branch,
            self.product,
            self.payment_card,
            Decimal("150.00"),
            Decimal("50.00"),
        )
        response = self.client.get(self.url)
        dist = response.json()["data"]["payment_distribution"]
        methods = [d["method"] for d in dist]
        self.assertIn("Credit Card", methods)

    def test_monthly_expenses_in_profitability(self):
        exp_cat = ExpenseCategory.objects.create(name="Rent")
        Expense.objects.create(
            category=exp_cat,
            amount=Decimal("1000.00"),
            date=date.today(),
        )
        response = self.client.get(self.url)
        profitability = response.json()["data"]["profitability"]
        self.assertEqual(profitability["total_monthly_expenses"], "1000.00")

    def test_empty_state_returns_valid_response(self):
        """No sales data → all zeros, empty lists."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["sales"]["today"]["revenue"], "0.00")
        self.assertEqual(data["profitability"]["gross_profit"], "0.00")


class BranchDashboardViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/dashboard/branch/"
        (
            self.employee,
            self.branch,
            self.category,
            self.product,
            self.payment_cash,
            self.payment_card,
        ) = create_base_data()

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        response = self.client.get(self.url)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("data", data)

    def test_data_sections_present(self):
        response = self.client.get(self.url)
        body = response.json()["data"]
        self.assertIn("current_sales", body)
        self.assertIn("open_shifts", body)
        self.assertIn("stock_alerts", body)
        self.assertIn("returns_today", body)

    def test_open_shifts_shown(self):
        shift = Shift.objects.create(
            employee=self.employee,
            branch=self.branch,
            status=Shift.STATUS_OPEN,
            cash_opening=Decimal("500.00"),
        )
        response = self.client.get(self.url)
        shifts = response.json()["data"]["open_shifts"]
        self.assertEqual(len(shifts), 1)
        self.assertEqual(shifts[0]["cash_opening"], "500.00")

    def test_branch_filter(self):
        other_branch = Branch.objects.create(name="Other Branch")
        Shift.objects.create(
            employee=self.employee,
            branch=self.branch,
            status=Shift.STATUS_OPEN,
        )
        Shift.objects.create(
            employee=self.employee,
            branch=other_branch,
            status=Shift.STATUS_OPEN,
        )
        response = self.client.get(self.url, {"branch_id": str(self.branch.id)})
        shifts = response.json()["data"]["open_shifts"]
        self.assertEqual(len(shifts), 1)

    def test_stock_alerts_shown(self):
        # product has current_stock=5 < min_stock=10
        response = self.client.get(self.url)
        alerts = response.json()["data"]["stock_alerts"]
        self.assertGreaterEqual(len(alerts), 1)

    def test_returns_today_shown(self):
        Return.objects.create(
            return_number="RET-001",
            employee=self.employee,
            branch=self.branch,
            total_amount=Decimal("75.00"),
        )
        response = self.client.get(self.url)
        ret = response.json()["data"]["returns_today"]
        self.assertEqual(ret["count"], 1)
        self.assertEqual(ret["total"], "75.00")

    def test_current_sales_amounts_are_strings(self):
        create_sale(
            self.employee,
            self.branch,
            self.product,
            self.payment_cash,
            Decimal("120.00"),
            Decimal("60.00"),
        )
        response = self.client.get(self.url)
        sales = response.json()["data"]["current_sales"]
        self.assertIsInstance(sales["total"], str)
        self.assertEqual(sales["count"], 1)

    def test_closed_shifts_not_shown(self):
        Shift.objects.create(
            employee=self.employee,
            branch=self.branch,
            status=Shift.STATUS_CLOSED,
        )
        response = self.client.get(self.url)
        shifts = response.json()["data"]["open_shifts"]
        self.assertEqual(len(shifts), 0)
