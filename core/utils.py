from decimal import Decimal

from django.http import JsonResponse


def api_response(data=None, message="", success=True, errors=None, status=200):
    return JsonResponse(
        {
            "success": success,
            "data": data,
            "message": message,
            "errors": errors,
        },
        status=status,
    )


def fmt(value):
    """Convert Decimal to fixed 2-decimal string for API responses."""
    if value is None:
        return "0.00"
    d = Decimal(value)
    return format(d, ".2f")
