from django.contrib import admin

from .models import Expense, ExpenseCategory


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "is_system", "is_active", "created_at"]
    list_filter = ["is_system", "is_active"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["category", "amount", "expense_date", "created_by", "is_active"]
    list_filter = ["category", "is_active", "expense_date"]
    search_fields = ["notes", "category__name"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "expense_date"
