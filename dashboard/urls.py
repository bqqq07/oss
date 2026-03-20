from django.urls import path

from . import views

app_name = "dashboard"

urlpatterns = [
    path("owner/", views.OwnerDashboardView.as_view(), name="owner"),
    path("branch/", views.BranchDashboardView.as_view(), name="branch"),
]
