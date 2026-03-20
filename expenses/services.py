"""
Profitability calculation services for the POS system.

All monetary values are returned as Decimal for precision.
Invoice model is resolved lazily via apps.get_model() so that this module
can be imported even before the invoices app is set up in INSTALLED_APPS.
"""

from decimal import Decimal

from django.apps import apps
from django.db.models import Sum

from .models import Expense


def _zero():
    return Decimal("0.00")


def get_total_expenses(date_from, date_to):
    """
    Return the sum of all active expenses in the given date range.

    Args:
        date_from (date): Start date (inclusive).
        date_to   (date): End date (inclusive).

    Returns:
        Decimal: Total expense amount.
    """
    result = (
        Expense.objects.filter(
            is_active=True,
            expense_date__gte=date_from,
            expense_date__lte=date_to,
        ).aggregate(total=Sum("amount"))["total"]
    )
    return result if result is not None else _zero()


def get_profitability_report(date_from, date_to):
    """
    Calculate the full profitability report for a given period.

    Depends on the ``invoices`` app and its ``Invoice`` model, which exposes:
        - total          : gross revenue per invoice (DecimalField)
        - gross_profit   : revenue minus cost of goods sold (DecimalField)
        - payment_fees   : payment-gateway / bank fees charged (DecimalField)

    Args:
        date_from (date): Start date (inclusive).
        date_to   (date): End date (inclusive).

    Returns:
        dict with keys:
            gross_revenue        – sum of invoice.total
            gross_profit         – sum of invoice.gross_profit
            payment_fees         – sum of invoice.payment_fees
            net_revenue          – gross_revenue - payment_fees
            total_expenses       – sum of expense.amount
            net_operating_profit – gross_profit - total_expenses
    """
    Invoice = apps.get_model("invoices", "Invoice")

    invoice_qs = Invoice.objects.filter(
        is_active=True,
        invoice_date__gte=date_from,
        invoice_date__lte=date_to,
    )

    aggregates = invoice_qs.aggregate(
        _gross_revenue=Sum("total"),
        _gross_profit=Sum("gross_profit"),
        _payment_fees=Sum("payment_fees"),
    )

    gross_revenue = aggregates["_gross_revenue"] or _zero()
    gross_profit = aggregates["_gross_profit"] or _zero()
    payment_fees = aggregates["_payment_fees"] or _zero()

    net_revenue = gross_revenue - payment_fees
    total_expenses = get_total_expenses(date_from, date_to)
    net_operating_profit = gross_profit - total_expenses

    return {
        "gross_revenue": gross_revenue,
        "gross_profit": gross_profit,
        "payment_fees": payment_fees,
        "net_revenue": net_revenue,
        "total_expenses": total_expenses,
        "net_operating_profit": net_operating_profit,
    }
