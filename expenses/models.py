import uuid

from django.db import models

from core.models import BaseModel


class ExpenseCategory(BaseModel):
    """Category for classifying expenses (e.g. rent, salaries, utilities)."""

    name = models.CharField(max_length=100, unique=True)
    is_system = models.BooleanField(
        default=False,
        help_text="System categories cannot be deleted by users.",
    )
    # is_active (soft-delete) inherited from BaseModel

    class Meta:
        db_table = "expense_categories"
        ordering = ["name"]
        verbose_name = "Expense Category"
        verbose_name_plural = "Expense Categories"

    def __str__(self):
        return self.name


class Expense(BaseModel):
    """A single expense record linked to a category."""

    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name="expenses",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )

    class Meta:
        db_table = "expenses"
        ordering = ["-expense_date", "-created_at"]
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"

    def __str__(self):
        return f"{self.category} — {self.amount} ({self.expense_date})"
