from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="employee",
            name="full_name",
            field=models.CharField(max_length=200, default=""),
            preserve_default=False,
        ),
        migrations.RemoveField(
            model_name="employee",
            name="first_name",
        ),
        migrations.RemoveField(
            model_name="employee",
            name="last_name",
        ),
        migrations.AlterModelOptions(
            name="employee",
            options={"ordering": ["full_name"]},
        ),
    ]
