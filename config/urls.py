"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/dashboard/", include("dashboard.urls")),
    path("api/v1/reports/", include("reports.urls")),
    path("api/v1/inventory/", include("inventory.urls")),
]
