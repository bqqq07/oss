import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("purchases", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add new financial fields
        migrations.AddField(
            model_name="purchaseinvoice",
            name="subtotal",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="purchaseinvoice",
            name="vat_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="purchaseinvoice",
            name="paid_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        # Add created_by as nullable first, then make non-nullable via a separate step
        migrations.AddField(
            model_name="purchaseinvoice",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="purchase_invoices",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Update status choices (data-only change, no schema change needed)
        migrations.AlterField(
            model_name="purchaseinvoice",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("confirmed", "Confirmed"),
                    ("partially_paid", "Partially Paid"),
                    ("paid", "Paid"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
    ]
