from django.db import models

from core.models import BaseModel


class PaymentMethod(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_cash = models.BooleanField(default=False)

    class Meta:
        db_table = "payment_methods"
        ordering = ["name"]

    def __str__(self):
        return self.name
