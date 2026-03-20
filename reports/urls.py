from django.urls import path

from . import views

app_name = "reports"

urlpatterns = [
    path("sales/", views.SalesReportView.as_view(), name="sales"),
    path("inventory/", views.InventoryReportView.as_view(), name="inventory"),
    path("purchases/", views.PurchasesReportView.as_view(), name="purchases"),
    path("profitability/", views.ProfitabilityReportView.as_view(), name="profitability"),
]
