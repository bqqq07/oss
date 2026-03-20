from django.db import models

from core.models import BaseModel


class Supplier(BaseModel):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    contact_person = models.CharField(max_length=200, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "suppliers"
        ordering = ["name"]

    def __str__(self):
        return self.name
