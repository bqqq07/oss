from decimal import Decimal
from datetime import date, timedelta

from django.db.models import (
    Count, DecimalField, ExpressionWrapper, F, Sum,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.views import View

from core.utils import api_response, fmt
from expenses.models import Expense
from inventory.models import Product
from payments.models import PaymentMethod
from sales.models import Return, Sale, SaleItem, SalePayment, Shift

ZERO = Decimal("0")


def _agg_revenue(qs):
    return qs.aggregate(
        total=Coalesce(Sum("final_amount"), ZERO, output_field=DecimalField())
    )["total"]


def _agg_cogs(qs):
    return qs.aggregate(
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


def _sales_agg(qs):
    rev = _agg_revenue(qs)
    cost = _agg_cogs(qs)
    count = qs.values("id").distinct().count()
    return {"revenue": fmt(rev), "cost_of_goods": fmt(cost), "count": count}


class OwnerDashboardView(View):
    def get(self, request):
        now = timezone.now()
        today = now.date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        base_qs = Sale.objects.filter(is_active=True).prefetch_related("items")
        sales_today = base_qs.filter(created_at__date=today)
        sales_week = base_qs.filter(created_at__date__gte=week_start)
        sales_month = base_qs.filter(created_at__date__gte=month_start)

        # --- Monthly expenses ---
        monthly_expenses = Expense.objects.filter(
            date__gte=month_start, is_active=True
        ).aggregate(
            total=Coalesce(Sum("amount"), ZERO, output_field=DecimalField())
        )["total"]

        # --- Gross / Net profit ---
        month_rev = _agg_revenue(sales_month)
        month_cogs = _agg_cogs(sales_month)
        gross_profit = month_rev - month_cogs
        net_operating_profit = gross_profit - monthly_expenses

        # --- Payment fees (month) ---
        payment_fees = []
        for p in (
            SalePayment.objects.filter(
                sale__created_at__date__gte=month_start,
                sale__is_active=True,
                is_active=True,
            )
            .select_related("payment_method")
            .values("payment_method__name", "payment_method__fee_percentage")
            .annotate(
                total_paid=Coalesce(Sum("amount"), ZERO, output_field=DecimalField())
            )
        ):
            fee_pct = p["payment_method__fee_percentage"] or ZERO
            fee_amount = p["total_paid"] * fee_pct / Decimal("100")
            payment_fees.append(
                {
                    "method": p["payment_method__name"],
                    "total_collected": fmt(p["total_paid"]),
                    "fee_percentage": fmt(fee_pct),
                    "fee_amount": fmt(fee_amount),
                }
            )

        # --- Top 10 products (month) ---
        top_products_data = [
            {
                "product_id": str(p["product__id"]),
                "product_name": p["product__name"],
                "sku": p["product__sku"],
                "total_qty": p["total_qty"],
                "total_revenue": fmt(p["total_revenue"]),
            }
            for p in (
                SaleItem.objects.filter(
                    sale__created_at__date__gte=month_start,
                    sale__is_active=True,
                    is_active=True,
                )
                .select_related("product", "product__category")
                .values("product__id", "product__name", "product__sku")
                .annotate(
                    total_qty=Coalesce(Sum("quantity"), 0),
                    total_revenue=Coalesce(
                        Sum("total_price"), ZERO, output_field=DecimalField()
                    ),
                )
                .order_by("-total_qty")[:10]
            )
        ]

        # --- Products below min_stock ---
        low_stock_data = [
            {
                "product_id": str(p["id"]),
                "name": p["name"],
                "sku": p["sku"],
                "current_stock": p["current_stock"],
                "min_stock": p["min_stock"],
                "category": p["category__name"],
            }
            for p in Product.objects.filter(
                is_active=True, current_stock__lt=F("min_stock")
            )
            .select_related("category")
            .values("id", "name", "sku", "current_stock", "min_stock", "category__name")
        ]

        # --- Dormant products (no movement > 30 days) ---
        thirty_days_ago = today - timedelta(days=30)
        active_product_ids = (
            SaleItem.objects.filter(
                sale__created_at__date__gte=thirty_days_ago,
                sale__is_active=True,
                is_active=True,
            )
            .values_list("product_id", flat=True)
            .distinct()
        )
        dormant_data = [
            {
                "product_id": str(p["id"]),
                "name": p["name"],
                "sku": p["sku"],
                "current_stock": p["current_stock"],
                "category": p["category__name"],
            }
            for p in Product.objects.filter(is_active=True)
            .exclude(id__in=active_product_ids)
            .select_related("category")
            .values("id", "name", "sku", "current_stock", "category__name")
        ]

        # --- Employee performance (month) ---
        employee_data = [
            {
                "employee_id": str(e["employee__id"]) if e["employee__id"] else None,
                "full_name": e["employee__full_name"],
                "sales_count": e["sales_count"],
                "total_revenue": fmt(e["total_revenue"]),
            }
            for e in (
                Sale.objects.filter(created_at__date__gte=month_start, is_active=True)
                .select_related("employee")
                .values("employee__id", "employee__full_name")
                .annotate(
                    sales_count=Count("id"),
                    total_revenue=Coalesce(
                        Sum("final_amount"), ZERO, output_field=DecimalField()
                    ),
                )
                .order_by("-total_revenue")
            )
        ]

        # --- Payment distribution (month) ---
        payment_dist_data = [
            {
                "method": p["payment_method__name"],
                "total": fmt(p["total"]),
                "count": p["count"],
            }
            for p in (
                SalePayment.objects.filter(
                    sale__created_at__date__gte=month_start,
                    sale__is_active=True,
                    is_active=True,
                )
                .select_related("payment_method")
                .values("payment_method__name")
                .annotate(
                    total=Coalesce(Sum("amount"), ZERO, output_field=DecimalField()),
                    count=Count("id"),
                )
                .order_by("-total")
            )
        ]

        data = {
            "sales": {
                "today": _sales_agg(sales_today),
                "week": _sales_agg(sales_week),
                "month": _sales_agg(sales_month),
            },
            "profitability": {
                "gross_profit": fmt(gross_profit),
                "net_operating_profit": fmt(net_operating_profit),
                "total_monthly_expenses": fmt(monthly_expenses),
            },
            "payment_fees": payment_fees,
            "top_products": top_products_data,
            "low_stock_products": low_stock_data,
            "dormant_products": dormant_data,
            "employee_performance": employee_data,
            "payment_distribution": payment_dist_data,
        }

        return api_response(data=data, message="Owner dashboard data")


class BranchDashboardView(View):
    def get(self, request):
        now = timezone.now()
        today = now.date()
        branch_id = request.GET.get("branch_id")

        # --- Current sales (today) ---
        sales_qs = Sale.objects.filter(created_at__date=today, is_active=True)
        if branch_id:
            sales_qs = sales_qs.filter(branch_id=branch_id)

        sales_agg = sales_qs.aggregate(
            count=Count("id"),
            total=Coalesce(Sum("final_amount"), ZERO, output_field=DecimalField()),
        )

        # --- Open shifts ---
        shifts_qs = Shift.objects.filter(
            status=Shift.STATUS_OPEN, is_active=True
        ).select_related("employee", "branch")
        if branch_id:
            shifts_qs = shifts_qs.filter(branch_id=branch_id)

        open_shifts = [
            {
                "shift_id": str(s.id),
                "employee": s.employee.full_name if s.employee else None,
                "branch": s.branch.name if s.branch else None,
                "started_at": s.started_at.isoformat(),
                "cash_opening": fmt(s.cash_opening),
            }
            for s in shifts_qs
        ]

        # --- Stock alerts ---
        stock_alerts = [
            {
                "product_id": str(p["id"]),
                "name": p["name"],
                "sku": p["sku"],
                "current_stock": p["current_stock"],
                "min_stock": p["min_stock"],
            }
            for p in Product.objects.filter(
                is_active=True, current_stock__lt=F("min_stock")
            ).values("id", "name", "sku", "current_stock", "min_stock")[:20]
        ]

        # --- Returns today ---
        returns_qs = Return.objects.filter(created_at__date=today, is_active=True)
        if branch_id:
            returns_qs = returns_qs.filter(branch_id=branch_id)

        returns_agg = returns_qs.aggregate(
            count=Count("id"),
            total=Coalesce(Sum("total_amount"), ZERO, output_field=DecimalField()),
        )

        data = {
            "current_sales": {
                "count": sales_agg["count"],
                "total": fmt(sales_agg["total"]),
            },
            "open_shifts": open_shifts,
            "stock_alerts": stock_alerts,
            "returns_today": {
                "count": returns_agg["count"],
                "total": fmt(returns_agg["total"]),
            },
        }

        return api_response(data=data, message="Branch dashboard data")
