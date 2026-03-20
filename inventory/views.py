from django.db.models import F
from django.views import View

from core.utils import api_response, fmt
from .models import Product


class LowStockView(View):
    def get(self, request):
        products = (
            Product.objects.filter(is_active=True, current_stock__lt=F("min_stock"))
            .select_related("category")
            .order_by("current_stock")
        )

        data = [
            {
                "product_id": str(p.id),
                "name": p.name,
                "sku": p.sku,
                "category": p.category.name if p.category else None,
                "current_stock": p.current_stock,
                "min_stock": p.min_stock,
                "shortage": p.min_stock - p.current_stock,
                "cost_price": fmt(p.cost_price),
                "selling_price": fmt(p.selling_price),
            }
            for p in products
        ]

        return api_response(
            data=data,
            message=f"{len(data)} products below minimum stock level",
        )


class ForecastCriticalView(View):
    def get(self, request):
        # v1 stub — forecasting engine not yet implemented
        return api_response(data=[], message="Forecast not yet available in v1")
