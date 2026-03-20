from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("suppliers", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="supplier",
            old_name="phone",
            new_name="mobile",
        ),
        migrations.AddField(
            model_name="supplier",
            name="balance_due",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
