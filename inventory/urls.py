from django.urls import path

from . import views

app_name = "inventory"

urlpatterns = [
    path("low-stock/", views.LowStockView.as_view(), name="low-stock"),
    path("forecast/critical/", views.ForecastCriticalView.as_view(), name="forecast-critical"),
]
