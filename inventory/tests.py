from decimal import Decimal

from django.test import Client, TestCase

from .models import Category, Product


def create_product(sku, stock, min_stock, cost=Decimal("30.00"), price=Decimal("60.00")):
    cat, _ = Category.objects.get_or_create(name="Test Category")
    return Product.objects.create(
        name=f"Product {sku}",
        sku=sku,
        category=cat,
        cost_price=cost,
        selling_price=price,
        min_stock=min_stock,
        current_stock=stock,
    )


class LowStockViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/inventory/low-stock/"

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        resp = self.client.get(self.url)
        data = resp.json()
        self.assertIn("success", data)
        self.assertIn("data", data)
        self.assertIn("message", data)
        self.assertIn("errors", data)
        self.assertTrue(data["success"])

    def test_only_below_min_returned(self):
        create_product("LOW001", stock=2, min_stock=10)
        create_product("OK001", stock=20, min_stock=5)
        resp = self.client.get(self.url)
        products = resp.json()["data"]
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["sku"], "LOW001")

    def test_shortage_field(self):
        create_product("SHORT001", stock=3, min_stock=10)
        resp = self.client.get(self.url)
        product = resp.json()["data"][0]
        self.assertEqual(product["shortage"], 7)

    def test_amounts_are_strings(self):
        create_product("STR001", stock=1, min_stock=5)
        resp = self.client.get(self.url)
        product = resp.json()["data"][0]
        self.assertIsInstance(product["cost_price"], str)
        self.assertIsInstance(product["selling_price"], str)

    def test_empty_when_all_in_stock(self):
        create_product("FULL001", stock=50, min_stock=5)
        resp = self.client.get(self.url)
        self.assertEqual(resp.json()["data"], [])

    def test_inactive_product_excluded(self):
        p = create_product("INACTIVE001", stock=0, min_stock=10)
        p.is_active = False
        p.save()
        resp = self.client.get(self.url)
        self.assertEqual(resp.json()["data"], [])

    def test_ordered_by_stock_ascending(self):
        create_product("LOW_A", stock=1, min_stock=10)
        create_product("LOW_B", stock=3, min_stock=10)
        create_product("LOW_C", stock=0, min_stock=10)
        resp = self.client.get(self.url)
        stocks = [p["current_stock"] for p in resp.json()["data"]]
        self.assertEqual(stocks, sorted(stocks))

    def test_product_fields_present(self):
        create_product("FIELD001", stock=2, min_stock=10)
        resp = self.client.get(self.url)
        product = resp.json()["data"][0]
        for field in ["product_id", "name", "sku", "category", "current_stock", "min_stock", "shortage", "cost_price", "selling_price"]:
            self.assertIn(field, product, msg=f"Missing field: {field}")


class ForecastCriticalViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/v1/inventory/forecast/critical/"

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_response_structure(self):
        resp = self.client.get(self.url)
        data = resp.json()
        self.assertIn("success", data)
        self.assertIn("data", data)
        self.assertTrue(data["success"])

    def test_returns_empty_list_in_v1(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.json()["data"], [])

    def test_returns_empty_even_with_low_stock_products(self):
        create_product("CRIT001", stock=0, min_stock=20)
        resp = self.client.get(self.url)
        self.assertEqual(resp.json()["data"], [])
