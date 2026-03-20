from django.db import models

from core.models import BaseModel


class ExpenseCategory(BaseModel):
    name = models.CharField(max_length=150, unique=True)

    class Meta:
        db_table = "expense_categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Expense(BaseModel):
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    branch = models.ForeignKey(
        "inventory.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, default="")
    date = models.DateField()
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "expenses"
        ordering = ["-date"]

    def __str__(self):
        return f"{self.category} — {self.amount} ({self.date})"
