import uuid

from django.db import migrations


def create_default_customer(apps, schema_editor):
    Customer = apps.get_model("customers", "Customer")
    Settings = apps.get_model("core", "Settings")

    customer = Customer.objects.create(
        full_name="عميل نقدي",
        is_system=True,
        is_active=True,
    )

    Settings.objects.update_or_create(
        key="cash_customer_id",
        defaults={
            "value": str(customer.id),
            "description": "UUID of the default cash customer used for walk-in sales",
            "is_public": False,
        },
    )


def delete_default_customer(apps, schema_editor):
    Customer = apps.get_model("customers", "Customer")
    Settings = apps.get_model("core", "Settings")

    Settings.objects.filter(key="cash_customer_id").delete()
    Customer.objects.filter(full_name="عميل نقدي", is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0001_initial"),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_default_customer, delete_default_customer),
    ]
