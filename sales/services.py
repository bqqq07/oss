"""
Sales services — business logic for sales operations.
ROLE-06: Sales return processing.
"""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import SalesInvoice, SalesInvoiceItem, SalesReturn, SalesReturnItem


def _generate_return_number(return_date) -> str:
    """
    Generate a unique return number in the format SR-YYYYMMDD-XXXXX.
    Uses select_for_update on the day's returns to prevent race conditions.
    """
    date_str = return_date.strftime("%Y%m%d")
    prefix = f"SR-{date_str}-"
    count = (
        SalesReturn.objects.select_for_update()
        .filter(return_number__startswith=prefix)
        .count()
    )
    sequence = str(count + 1).zfill(5)
    return f"{prefix}{sequence}"


def _update_invoice_status(invoice: SalesInvoice) -> None:
    """
    Recalculate and update SalesInvoice.status based on returned quantities.

    Rules:
    - If total returned quantity == total invoiced quantity → fully_returned
    - If total returned quantity > 0 but < total invoiced quantity → partially_returned
    - Otherwise keep current status (completed / pending)
    """
    invoice_items = invoice.items.filter(is_active=True)

    total_invoiced_qty = sum(item.quantity for item in invoice_items)
    if total_invoiced_qty == 0:
        return

    total_returned_qty = Decimal("0")
    for item in invoice_items:
        returned = sum(
            ri.quantity
            for ri in item.return_items.filter(
                is_active=True, sales_return__is_active=True
            )
        )
        total_returned_qty += returned

    if total_returned_qty >= total_invoiced_qty:
        invoice.status = "fully_returned"
    elif total_returned_qty > 0:
        invoice.status = "partially_returned"

    invoice.save(update_fields=["status", "updated_at"])


def _restore_inventory(product, quantity: Decimal, cost_snapshot: Decimal) -> None:
    """
    Add returned quantity back to product stock using weighted average costing.

    New avg_cost = (existing_qty * existing_avg + returned_qty * cost_snapshot)
                  / (existing_qty + returned_qty)
    """
    from inventory.models import Product  # local import to avoid circular dependency

    # Re-fetch with lock to avoid race conditions
    product = Product.objects.select_for_update().get(pk=product.pk)

    existing_qty = product.quantity_on_hand
    existing_avg = product.avg_cost

    new_qty = existing_qty + quantity

    if new_qty > 0:
        new_avg = (existing_qty * existing_avg + quantity * cost_snapshot) / new_qty
    else:
        new_avg = existing_avg

    product.quantity_on_hand = new_qty
    product.avg_cost = new_avg.quantize(Decimal("0.01"))
    product.save(update_fields=["quantity_on_hand", "avg_cost", "updated_at"])


def _adjust_employee_commission(employee, return_amount: Decimal) -> None:
    """
    Reduce the employee's commission for the returned amount.

    Commission records are managed by ROLE-05. This hook subtracts the
    return amount from the employee's current-period commission balance.
    If no commission infrastructure exists yet, the call is a no-op.
    """
    try:
        from core.models import Employee as EmployeeModel  # noqa: F401

        # ROLE-05 commission logic: create a negative commission adjustment.
        # When ROLE-05 is implemented, replace this with the actual commission
        # deduction call, e.g.:
        #   CommissionRecord.objects.create(
        #       employee=employee,
        #       amount=-return_amount,
        #       record_type="return_adjustment",
        #   )
        pass  # pragma: no cover — filled in by ROLE-05
    except Exception:  # noqa: BLE001
        # Never let a missing commission module break the return flow.
        pass


@transaction.atomic
def process_sales_return(
    *,
    sales_invoice_id,
    items_data: list[dict],
    employee_id,
    refund_method: str,
    return_date=None,
    reason: str = "",
    notes: str = "",
) -> SalesReturn:
    """
    Process a sales return against an existing invoice.

    Parameters
    ----------
    sales_invoice_id : UUID or str
        PK of the SalesInvoice being returned against.
    items_data : list of dicts
        Each dict must contain:
            - sales_invoice_item_id  : UUID/str — the original line item
            - quantity               : Decimal  — qty being returned (> 0)
    employee_id : UUID or str
        PK of the Employee processing the return.
    refund_method : str
        One of: 'cash', 'transfer', 'store_credit'.
    return_date : date, optional
        Defaults to today (UTC).
    reason : str, optional
    notes : str, optional

    Returns
    -------
    SalesReturn instance (already saved).

    Raises
    ------
    ValueError
        - If items_data is empty.
        - If a requested return quantity exceeds the remaining returnable qty.
        - If refund_method is invalid.
    """
    from core.models import Employee

    VALID_REFUND_METHODS = {"cash", "transfer", "store_credit"}
    if refund_method not in VALID_REFUND_METHODS:
        raise ValueError(
            f"Invalid refund_method '{refund_method}'. "
            f"Choose from: {', '.join(sorted(VALID_REFUND_METHODS))}."
        )

    if not items_data:
        raise ValueError("items_data must contain at least one item.")

    if return_date is None:
        return_date = timezone.now().date()

    invoice = SalesInvoice.objects.select_for_update().get(pk=sales_invoice_id)
    employee = Employee.objects.get(pk=employee_id)

    return_number = _generate_return_number(return_date)

    sales_return = SalesReturn.objects.create(
        sales_invoice=invoice,
        return_number=return_number,
        employee=employee,
        return_date=return_date,
        refund_method=refund_method,
        reason=reason,
        notes=notes,
        total_amount=Decimal("0"),
    )

    total_amount = Decimal("0")

    for item_data in items_data:
        invoice_item = SalesInvoiceItem.objects.select_for_update().get(
            pk=item_data["sales_invoice_item_id"],
            sales_invoice=invoice,
        )

        return_qty = Decimal(str(item_data["quantity"]))
        if return_qty <= 0:
            raise ValueError(
                f"Return quantity must be positive for item {invoice_item.pk}."
            )

        # Calculate already-returned quantity for this line item
        already_returned = sum(
            ri.quantity
            for ri in invoice_item.return_items.filter(
                is_active=True,
                sales_return__is_active=True,
            )
        )
        max_returnable = invoice_item.quantity - already_returned
        if return_qty > max_returnable:
            raise ValueError(
                f"Cannot return {return_qty} units of '{invoice_item.product.name}'. "
                f"Only {max_returnable} units are returnable."
            )

        unit_price = invoice_item.unit_price
        avg_cost = invoice_item.avg_cost_snapshot

        # profit effect: returning reduces revenue but also reduces COGS
        # effect = -(qty * unit_price) + (qty * avg_cost)
        #        = qty * (avg_cost - unit_price)   [negative when sold at profit]
        line_effect = return_qty * (avg_cost - unit_price)

        SalesReturnItem.objects.create(
            sales_return=sales_return,
            sales_invoice_item=invoice_item,
            product=invoice_item.product,
            quantity=return_qty,
            unit_price=unit_price,
            avg_cost_snapshot=avg_cost,
            line_effect_on_profit=line_effect.quantize(Decimal("0.01")),
        )

        line_total = (return_qty * unit_price).quantize(Decimal("0.01"))
        total_amount += line_total

        _restore_inventory(invoice_item.product, return_qty, avg_cost)

    sales_return.total_amount = total_amount
    sales_return.save(update_fields=["total_amount", "updated_at"])

    _update_invoice_status(invoice)
    _adjust_employee_commission(employee, total_amount)

    return sales_return
