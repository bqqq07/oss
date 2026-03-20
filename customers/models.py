from django.db import models

from core.models import BaseModel


class Customer(BaseModel):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    full_name = models.CharField(max_length=200)
    mobile = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    gender = models.CharField(
        max_length=10, choices=GENDER_CHOICES, blank=True, default=""
    )
    date_of_birth = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    marketing_opt_in = models.BooleanField(default=False)
    loyalty_points = models.PositiveIntegerField(default=0)
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = "customers"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
