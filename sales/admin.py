from django.contrib import admin

from .models import CashMovement, Customer, Product, SalesInvoice, SalesInvoiceItem, Shift


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "is_active", "created_at")
    search_fields = ("name", "phone", "email")
    list_filter = ("is_active",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "is_active")
    search_fields = ("sku", "name")
    list_filter = ("is_active",)


class SalesInvoiceItemInline(admin.TabularInline):
    model = SalesInvoiceItem
    extra = 0
    readonly_fields = ("line_total", "line_profit", "avg_cost_snapshot")


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("id", "employee", "device", "status", "opened_at", "closed_at")
    list_filter = ("status",)
    search_fields = ("employee__full_name", "device__name")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_no", "employee", "customer", "total", "status", "sync_status", "sold_at",
    )
    list_filter = ("status", "sync_status")
    search_fields = ("invoice_no", "employee__full_name", "customer__name")
    readonly_fields = ("invoice_no", "id", "created_at", "updated_at")
    inlines = [SalesInvoiceItemInline]


@admin.register(CashMovement)
class CashMovementAdmin(admin.ModelAdmin):
    list_display = ("shift", "movement_type", "amount", "created_by", "created_at")
    list_filter = ("movement_type",)
    search_fields = ("shift__id", "created_by__full_name")
    readonly_fields = ("id", "created_at", "updated_at")
