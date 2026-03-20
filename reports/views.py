from decimal import Decimal
from datetime import date, timedelta

from django.db.models import (
    Count, DecimalField, ExpressionWrapper, F, Sum,
)
from django.db.models.functions import Coalesce, TruncDate
from django.views import View

from core.utils import api_response, fmt
from expenses.models import Expense
from inventory.models import Product
from purchases.models import PurchaseOrder
from sales.models import Return, Sale, SaleItem, SalePayment

ZERO = Decimal("0")


def _parse_date_range(request):
    today = date.today()
    month_start = today.replace(day=1)
    date_from_str = request.GET.get("date_from", month_start.isoformat())
    date_to_str = request.GET.get("date_to", today.isoformat())
    try:
        date_from = date.fromisoformat(date_from_str)
        date_to = date.fromisoformat(date_to_str)
    except ValueError:
        date_from, date_to = month_start, today
    return date_from, date_to


class SalesReportView(View):
    def get(self, request):
        date_from, date_to = _parse_date_range(request)
        branch_id = request.GET.get("branch_id")
        employee_id = request.GET.get("employee_id")

        sales_qs = Sale.objects.filter(
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
            is_active=True,
        ).select_related("employee", "branch").prefetch_related("items", "payments")

        if branch_id:
            sales_qs = sales_qs.filter(branch_id=branch_id)
        if employee_id:
            sales_qs = sales_qs.filter(employee_id=employee_id)

        summary = sales_qs.aggregate(
            count=Count("id"),
            total_revenue=Coalesce(Sum("final_amount"), ZERO, output_field=DecimalField()),
            total_discount=Coalesce(Sum("discount_amount"), ZERO, output_field=DecimalField()),
        )
        cogs = sales_qs.aggregate(
            total=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("items__cost_price") * F("items__quantity"),
                        output_field=DecimalField(),
                    )
                ),
                ZERO,
                output_field=DecimalField(),
            )
        )["total"]

        revenue = summary["total_revenue"]
        gross_profit = revenue - cogs

        daily = (
            sales_qs.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                count=Count("id"),
                revenue=Coalesce(Sum("final_amount"), ZERO, output_field=DecimalField()),
            )
            .order_by("day")
        )
        daily_data = [
            {
                "date": str(d["day"]),
                "count": d["count"],
                "revenue": fmt(d["revenue"]),
            }
            for d in daily
        ]

        returns_agg = Return.objects.filter(
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
            is_active=True,
        ).aggregate(
            count=Count("id"),
            total=Coalesce(Sum("total_amount"), ZERO, output_field=DecimalField()),
        )

        data = {
            "period": {"date_from": str(date_from), "date_to": str(date_to)},
            "summary": {
                "sales_count": summary["count"],
                "total_revenue": fmt(revenue),
                "total_discount": fmt(summary["total_discount"]),
                "total_cogs": fmt(cogs),
                "gross_profit": fmt(gross_profit),
            },
            "returns": {
                "count": returns_agg["count"],
                "total": fmt(returns_agg["total"]),
            },
            "daily_breakdown": daily_data,
        }
        return api_response(data=data, message="Sales report")


class InventoryReportView(View):
    def get(self, request):
        category_id = request.GET.get("category_id")

        products_qs = Product.objects.filter(is_active=True).select_related("category")
        if category_id:
            products_qs = products_qs.filter(category_id=category_id)

        summary = products_qs.aggregate(
            total_products=Count("id"),
            total_stock_value=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("cost_price") * F("current_stock"),
                        output_field=DecimalField(),
                    )
                ),
                ZERO,
                output_field=DecimalField(),
            ),
            total_retail_value=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("selling_price") * F("current_stock"),
                        output_field=DecimalField(),
                    )
                ),
                ZERO,
                output_field=DecimalField(),
            ),
        )

        below_min = products_qs.filter(current_stock__lt=F("min_stock")).count()
        zero_stock = products_qs.filter(current_stock=0).count()

        products_data = [
            {
                "product_id": str(p.id),
                "name": p.name,
                "sku": p.sku,
                "category": p.category.name if p.category else None,
                "current_stock": p.current_stock,
                "min_stock": p.min_stock,
                "cost_price": fmt(p.cost_price),
                "selling_price": fmt(p.selling_price),
                "stock_cost_value": fmt(p.cost_price * p.current_stock),
            }
            for p in products_qs.order_by("name")
        ]

        data = {
            "summary": {
                "total_products": summary["total_products"],
                "below_min_stock": below_min,
                "zero_stock": zero_stock,
                "total_stock_value": fmt(summary["total_stock_value"]),
                "total_retail_value": fmt(summary["total_retail_value"]),
            },
            "products": products_data,
        }
        return api_response(data=data, message="Inventory report")


class PurchasesReportView(View):
    def get(self, request):
        date_from, date_to = _parse_date_range(request)
        supplier_id = request.GET.get("supplier_id")

        orders_qs = PurchaseOrder.objects.filter(
            order_date__gte=date_from,
            order_date__lte=date_to,
            is_active=True,
        ).select_related("supplier", "employee").prefetch_related("items", "items__product")

        if supplier_id:
            orders_qs = orders_qs.filter(supplier_id=supplier_id)

        summary = orders_qs.aggregate(
            count=Count("id"),
            total=Coalesce(Sum("total_amount"), ZERO, output_field=DecimalField()),
        )

        by_status = (
            orders_qs.values("status")
            .annotate(
                count=Count("id"),
                total=Coalesce(Sum("total_amount"), ZERO, output_field=DecimalField()),
            )
        )

        orders_data = [
            {
                "order_id": str(o.id),
                "order_number": o.order_number,
                "supplier": o.supplier.name if o.supplier else None,
                "order_date": str(o.order_date),
                "status": o.status,
                "total_amount": fmt(o.total_amount),
                "items_count": o.items.count(),
            }
            for o in orders_qs.order_by("-order_date")
        ]

        data = {
            "period": {"date_from": str(date_from), "date_to": str(date_to)},
            "summary": {
                "orders_count": summary["count"],
                "total_amount": fmt(summary["total"]),
            },
            "by_status": [
                {"status": s["status"], "count": s["count"], "total": fmt(s["total"])}
                for s in by_status
            ],
            "orders": orders_data,
        }
        return api_response(data=data, message="Purchases report")


class ProfitabilityReportView(View):
    def get(self, request):
        date_from, date_to = _parse_date_range(request)

        sales_qs = Sale.objects.filter(
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
            is_active=True,
        ).prefetch_related("items")

        revenue = sales_qs.aggregate(
            total=Coalesce(Sum("final_amount"), ZERO, output_field=DecimalField())
        )["total"]

        cogs = sales_qs.aggregate(
            total=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("items__cost_price") * F("items__quantity"),
                        output_field=DecimalField(),
                    )
                ),
                ZERO,
                output_field=DecimalField(),
            )
        )["total"]

        discounts = sales_qs.aggregate(
            total=Coalesce(Sum("discount_amount"), ZERO, output_field=DecimalField())
        )["total"]

        expenses = Expense.objects.filter(
            date__gte=date_from, date__lte=date_to, is_active=True
        ).aggregate(
            total=Coalesce(Sum("amount"), ZERO, output_field=DecimalField())
        )["total"]

        returns_total = Return.objects.filter(
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
            is_active=True,
        ).aggregate(
            total=Coalesce(Sum("total_amount"), ZERO, output_field=DecimalField())
        )["total"]

        # Payment fees
        payment_fees = ZERO
        for sp in (
            SalePayment.objects.filter(
                sale__created_at__date__gte=date_from,
                sale__created_at__date__lte=date_to,
                sale__is_active=True,
                is_active=True,
            )
            .select_related("payment_method")
            .values("payment_method__fee_percentage")
            .annotate(
                total_paid=Coalesce(Sum("amount"), ZERO, output_field=DecimalField())
            )
        ):
            fee_pct = sp["payment_method__fee_percentage"] or ZERO
            payment_fees += sp["total_paid"] * fee_pct / Decimal("100")

        gross_profit = revenue - cogs
        net_operating_profit = gross_profit - expenses - payment_fees

        gross_margin = (
            round(gross_profit / revenue * 100, 2) if revenue else ZERO
        )

        exp_by_category = (
            Expense.objects.filter(date__gte=date_from, date__lte=date_to, is_active=True)
            .select_related("category")
            .values("category__name")
            .annotate(
                total=Coalesce(Sum("amount"), ZERO, output_field=DecimalField())
            )
            .order_by("-total")
        )

        data = {
            "period": {"date_from": str(date_from), "date_to": str(date_to)},
            "income_statement": {
                "revenue": fmt(revenue),
                "cost_of_goods_sold": fmt(cogs),
                "gross_profit": fmt(gross_profit),
                "gross_margin_pct": str(gross_margin),
                "total_expenses": fmt(expenses),
                "payment_fees": fmt(payment_fees),
                "returns": fmt(returns_total),
                "discounts_given": fmt(discounts),
                "net_operating_profit": fmt(net_operating_profit),
            },
            "expenses_by_category": [
                {"category": e["category__name"], "total": fmt(e["total"])}
                for e in exp_by_category
            ],
        }
        return api_response(data=data, message="Profitability report")
