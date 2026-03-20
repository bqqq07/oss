from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction


def compute_weighted_average_cost(
    old_quantity: Decimal,
    old_average_cost: Decimal,
    new_quantity: Decimal,
    new_unit_cost: Decimal,
) -> Decimal:
    """
    Compute the new weighted average cost after receiving new stock.

    Formula:
        new_avg = (old_qty * old_avg + new_qty * new_cost) / (old_qty + new_qty)

    Returns the new average cost rounded to 2 decimal places.
    Raises ValueError if total quantity would be zero or negative.
    """
    total_quantity = old_quantity + new_quantity
    if total_quantity <= 0:
        raise ValueError(
            "Total quantity must be positive to compute a weighted average cost."
        )

    numerator = (old_quantity * old_average_cost) + (new_quantity * new_unit_cost)
    new_avg = numerator / total_quantity
    return new_avg.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@transaction.atomic
def apply_purchase_invoice(invoice):
    """
    Confirm a draft PurchaseInvoice:
      - Updates each product's average_cost and stock_quantity using the
        weighted average cost formula.
      - Sets the invoice status to 'confirmed'.

    Raises ValueError if the invoice is not in 'draft' status.
    """
    if invoice.status != "draft":
        raise ValueError(
            f"Invoice {invoice.invoice_number} is not in draft status "
            f"(current: {invoice.status})."
        )

    for item in invoice.items.select_related("product").all():
        product = item.product
        product.average_cost = compute_weighted_average_cost(
            old_quantity=product.stock_quantity,
            old_average_cost=product.average_cost,
            new_quantity=item.quantity,
            new_unit_cost=item.unit_cost,
        )
        product.stock_quantity += item.quantity
        product.save(update_fields=["average_cost", "stock_quantity", "updated_at"])

    invoice.status = "confirmed"
    invoice.save(update_fields=["status", "updated_at"])


@transaction.atomic
def apply_purchase_return(purchase_return):
    """
    Confirm a draft PurchaseReturn:
      - Reduces each product's stock_quantity.
      - Recalculates average_cost when remaining stock > 0; otherwise resets to 0.
      - Sets the return status to 'confirmed'.

    Raises ValueError if the return is not in 'draft' status.
    """
    if purchase_return.status != "draft":
        raise ValueError(
            f"Return {purchase_return.return_number} is not in draft status "
            f"(current: {purchase_return.status})."
        )

    for item in purchase_return.items.select_related("invoice_item__product").all():
        product = item.invoice_item.product
        product.stock_quantity -= item.quantity

        if product.stock_quantity > 0:
            # Keep existing average_cost — returning stock doesn't change the avg cost
            pass
        else:
            product.stock_quantity = Decimal("0")
            product.average_cost = Decimal("0")

        product.save(update_fields=["average_cost", "stock_quantity", "updated_at"])

    purchase_return.status = "confirmed"
    purchase_return.save(update_fields=["status", "updated_at"])
