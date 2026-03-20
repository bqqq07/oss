from django.db import migrations


DEFAULT_METHODS = [
    {
        "name": "كاش",
        "fee_type": "none",
        "fee_percentage": 0,
        "fee_fixed": 0,
    },
    {
        "name": "مدى",
        "fee_type": "percentage",
        "fee_percentage": "1.5000",
        "fee_fixed": 0,
    },
    {
        "name": "فيزا",
        "fee_type": "percentage",
        "fee_percentage": "2.5000",
        "fee_fixed": 0,
    },
    {
        "name": "Apple Pay",
        "fee_type": "percentage",
        "fee_percentage": "1.0000",
        "fee_fixed": 0,
    },
]


def create_default_payment_methods(apps, schema_editor):
    PaymentMethod = apps.get_model("payments", "PaymentMethod")
    for data in DEFAULT_METHODS:
        PaymentMethod.objects.get_or_create(name=data["name"], defaults=data)


def delete_default_payment_methods(apps, schema_editor):
    PaymentMethod = apps.get_model("payments", "PaymentMethod")
    names = [m["name"] for m in DEFAULT_METHODS]
    PaymentMethod.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            create_default_payment_methods, delete_default_payment_methods
        ),
    ]
