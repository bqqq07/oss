from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0002_rename_product_name_to_full_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="parent_group",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AddField(
            model_name="product",
            name="scent",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="product",
            name="size_label",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="product",
            name="has_expiry",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="product",
            name="is_returnable",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="product",
            name="min_stock",
            field=models.DecimalField(decimal_places=3, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="product",
            name="reorder_point",
            field=models.DecimalField(decimal_places=3, default=0, max_digits=10),
        ),
    ]
