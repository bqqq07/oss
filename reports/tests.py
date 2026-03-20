import json
from datetime import date, timedelta
from decimal import Decimal

from django.test import Client, TestCase

from core.models import Employee
from expenses.models import Expense, ExpenseCategory
from inventory.models import Branch, Category, Product
from payments.models import PaymentMethod
from purchases.models import PurchaseOrder, PurchaseItem, Supplier
from sales.models import Return, Sale, SaleItem, SalePayment


def create_employee():
    from django.contrib.auth.models import User
    user = User.objects.create_user(username=f"u{Employee.objects.count()}", password="x")
    return Employee.objects.create(
        full_name="Reporter",
        email=f"rep{Employee.objects.count()}@test.com",
        salary=Decimal("3000.00"),
        user=user,
    )


def create_product(sku="PSKU001", stock=20, min_stock=5):
    cat, _ = Category.objects.get_or_create(name="General")
    return Product.objects.create(
        name=f"Product {sku}",
        sku=sku,
        category=cat,
        cost_price=Decimal("40.00"),
        selling_price=Decimal("80.00"),
        min_stock=min_stock,
        current_stock=stock,
    )


def create_sale_with_items(employee, branch, product, payment_method):
    sale = Sale.objects.create(
        sale_number=f"SR-{Sale.objects.count() + 1:04d}",
        employee=employee,
        branch=branch,
        subtotal=Decimal("80.00"),
        discount_amount=Decimal("5.00"),
        final_amount=Decimal("75.00"),
    )
    SaleItem.objects.create(
        sale=sale,
        product=product,
        quantity=1,
        unit_price=Decimal("80.00"),
        cost_price=Decimal("40.00"),
        total_price=Decimal("80.00"),
    )
    SalePayment.objects.create(sale=sale, payment_method=payment_method, amount=Decimal("75.00"))
    return sale


class SalesReportViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/reports/sales/"
        self.employee = create_employee()
        self.branch = Branch.objects.create(name="Branch A")
        self.product = create_product()
        self.payment = PaymentMethod.objects.create(name="Cash", fee_percentage=Decimal("0"))

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        resp = self.client.get(self.url)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("data", data)
        self.assertIsNone(data["errors"])

    def test_data_keys(self):
        resp = self.client.get(self.url)
        body = resp.json()["data"]
        self.assertIn("period", body)
        self.assertIn("summary", body)
        self.assertIn("returns", body)
        self.assertIn("daily_breakdown", body)

    def test_summary_amounts_are_strings(self):
        create_sale_with_items(self.employee, self.branch, self.product, self.payment)
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        self.assertIsInstance(summary["total_revenue"], str)
        self.assertIsInstance(summary["total_cogs"], str)
        self.assertIsInstance(summary["gross_profit"], str)

    def test_date_range_filter(self):
        create_sale_with_items(self.employee, self.branch, self.product, self.payment)
        today = date.today()
        resp = self.client.get(
            self.url,
            {"date_from": today.isoformat(), "date_to": today.isoformat()},
        )
        summary = resp.json()["data"]["summary"]
        self.assertEqual(summary["sales_count"], 1)
        self.assertEqual(summary["total_revenue"], "75.00")

    def test_date_range_excludes_outside(self):
        create_sale_with_items(self.employee, self.branch, self.product, self.payment)
        future_start = (date.today() + timedelta(days=1)).isoformat()
        future_end = (date.today() + timedelta(days=2)).isoformat()
        resp = self.client.get(
            self.url, {"date_from": future_start, "date_to": future_end}
        )
        self.assertEqual(resp.json()["data"]["summary"]["sales_count"], 0)

    def test_daily_breakdown(self):
        create_sale_with_items(self.employee, self.branch, self.product, self.payment)
        resp = self.client.get(self.url)
        daily = resp.json()["data"]["daily_breakdown"]
        self.assertEqual(len(daily), 1)
        self.assertIsInstance(daily[0]["revenue"], str)

    def test_gross_profit_calculation(self):
        create_sale_with_items(self.employee, self.branch, self.product, self.payment)
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        # revenue=75, cogs=40, gross=35
        self.assertEqual(summary["total_revenue"], "75.00")
        self.assertEqual(summary["total_cogs"], "40.00")
        self.assertEqual(summary["gross_profit"], "35.00")

    def test_empty_state(self):
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        self.assertEqual(summary["sales_count"], 0)
        self.assertEqual(summary["total_revenue"], "0.00")


class InventoryReportViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/reports/inventory/"

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        resp = self.client.get(self.url)
        data = resp.json()
        self.assertTrue(data["success"])
        body = data["data"]
        self.assertIn("summary", body)
        self.assertIn("products", body)

    def test_summary_fields(self):
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        self.assertIn("total_products", summary)
        self.assertIn("below_min_stock", summary)
        self.assertIn("zero_stock", summary)
        self.assertIn("total_stock_value", summary)
        self.assertIn("total_retail_value", summary)

    def test_amounts_are_strings(self):
        create_product(sku="INV001", stock=10, min_stock=5)
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        self.assertIsInstance(summary["total_stock_value"], str)
        self.assertIsInstance(summary["total_retail_value"], str)

    def test_below_min_stock_count(self):
        create_product(sku="LOW001", stock=2, min_stock=10)
        create_product(sku="OK001", stock=20, min_stock=5)
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        self.assertEqual(summary["below_min_stock"], 1)

    def test_stock_values_calculation(self):
        create_product(sku="CALC001", stock=10, min_stock=5)
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        # cost=40*10=400, retail=80*10=800
        self.assertEqual(summary["total_stock_value"], "400.00")
        self.assertEqual(summary["total_retail_value"], "800.00")

    def test_product_list_in_response(self):
        create_product(sku="LIST001", stock=5, min_stock=2)
        resp = self.client.get(self.url)
        products = resp.json()["data"]["products"]
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["sku"], "LIST001")

    def test_product_cost_price_is_string(self):
        create_product(sku="STR001")
        resp = self.client.get(self.url)
        p = resp.json()["data"]["products"][0]
        self.assertIsInstance(p["cost_price"], str)
        self.assertIsInstance(p["selling_price"], str)


class PurchasesReportViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/reports/purchases/"
        self.employee = create_employee()
        self.supplier = Supplier.objects.create(name="Supplier Co")
        self.product = create_product(sku="PUR001")

    def _create_order(self, status="received"):
        order = PurchaseOrder.objects.create(
            order_number=f"PO-{PurchaseOrder.objects.count() + 1:04d}",
            supplier=self.supplier,
            employee=self.employee,
            order_date=date.today(),
            total_amount=Decimal("500.00"),
            status=status,
        )
        PurchaseItem.objects.create(
            purchase=order,
            product=self.product,
            quantity=10,
            unit_cost=Decimal("50.00"),
            total_cost=Decimal("500.00"),
        )
        return order

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        resp = self.client.get(self.url)
        data = resp.json()
        self.assertTrue(data["success"])
        body = data["data"]
        self.assertIn("period", body)
        self.assertIn("summary", body)
        self.assertIn("by_status", body)
        self.assertIn("orders", body)

    def test_summary_counts(self):
        self._create_order()
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        self.assertEqual(summary["orders_count"], 1)
        self.assertEqual(summary["total_amount"], "500.00")

    def test_total_amount_is_string(self):
        self._create_order()
        resp = self.client.get(self.url)
        summary = resp.json()["data"]["summary"]
        self.assertIsInstance(summary["total_amount"], str)

    def test_by_status_breakdown(self):
        self._create_order(status="received")
        self._create_order(status="pending")
        resp = self.client.get(self.url)
        by_status = resp.json()["data"]["by_status"]
        statuses = {s["status"]: s for s in by_status}
        self.assertIn("received", statuses)
        self.assertIn("pending", statuses)

    def test_empty_state(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.json()["data"]["summary"]["orders_count"], 0)
        self.assertEqual(resp.json()["data"]["summary"]["total_amount"], "0.00")


class ProfitabilityReportViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/reports/profitability/"
        self.employee = create_employee()
        self.branch = Branch.objects.create(name="Profit Branch")
        self.product = create_product(sku="PROF001")
        self.payment = PaymentMethod.objects.create(
            name="Mada", fee_percentage=Decimal("1.50")
        )
        self.exp_cat = ExpenseCategory.objects.create(name="Utilities")

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        resp = self.client.get(self.url)
        data = resp.json()
        self.assertTrue(data["success"])
        body = data["data"]
        self.assertIn("period", body)
        self.assertIn("income_statement", body)
        self.assertIn("expenses_by_category", body)

    def test_income_statement_fields(self):
        resp = self.client.get(self.url)
        stmt = resp.json()["data"]["income_statement"]
        for key in [
            "revenue", "cost_of_goods_sold", "gross_profit",
            "total_expenses", "payment_fees", "net_operating_profit",
        ]:
            self.assertIn(key, stmt)

    def test_all_amounts_are_strings(self):
        resp = self.client.get(self.url)
        stmt = resp.json()["data"]["income_statement"]
        for key, val in stmt.items():
            if key != "gross_margin_pct":
                self.assertIsInstance(val, str, msg=f"{key} should be string")

    def test_net_profit_calculation(self):
        create_sale_with_items(self.employee, self.branch, self.product, self.payment)
        Expense.objects.create(
            category=self.exp_cat,
            amount=Decimal("10.00"),
            date=date.today(),
        )
        resp = self.client.get(self.url)
        stmt = resp.json()["data"]["income_statement"]
        # revenue=75, cogs=40, gross=35, expenses=10, fees=75*1.5/100=1.125
        # net = 35 - 10 - 1.125 = 23.875
        self.assertEqual(stmt["revenue"], "75.00")
        self.assertEqual(stmt["cost_of_goods_sold"], "40.00")
        self.assertEqual(stmt["gross_profit"], "35.00")
        self.assertEqual(stmt["total_expenses"], "10.00")

    def test_expenses_by_category(self):
        Expense.objects.create(
            category=self.exp_cat, amount=Decimal("200.00"), date=date.today()
        )
        resp = self.client.get(self.url)
        cats = resp.json()["data"]["expenses_by_category"]
        self.assertEqual(len(cats), 1)
        self.assertEqual(cats[0]["category"], "Utilities")
        self.assertEqual(cats[0]["total"], "200.00")

    def test_empty_state(self):
        resp = self.client.get(self.url)
        stmt = resp.json()["data"]["income_statement"]
        self.assertEqual(stmt["revenue"], "0.00")
        self.assertEqual(stmt["net_operating_profit"], "0.00")
