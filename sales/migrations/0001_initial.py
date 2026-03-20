import uuid

import django.db.models.deletion
from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0002_employee_full_name"),
    ]

    operations = [
        # ── Customer ──────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Customer",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                ("phone", models.CharField(blank=True, default="", max_length=20)),
                ("email", models.EmailField(blank=True, default="")),
            ],
            options={
                "db_table": "sales_customers",
                "ordering": ["name"],
            },
        ),
        # ── Product stub ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Product",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                ("sku", models.CharField(max_length=100, unique=True)),
            ],
            options={
                "db_table": "sales_product_stub",
                "ordering": ["sku"],
            },
        ),
        # ── Shift ─────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Shift",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="shifts",
                        to="core.employee",
                    ),
                ),
                (
                    "device",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="shifts",
                        to="core.device",
                    ),
                ),
                ("opened_at", models.DateTimeField()),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "opening_cash",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "closing_cash_expected",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "closing_cash_actual",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("closed", "Closed"),
                            ("suspended", "Suspended"),
                        ],
                        default="open",
                        max_length=20,
                    ),
                ),
            ],
            options={
                "db_table": "sales_shifts",
                "ordering": ["-opened_at"],
            },
        ),
        # ── SalesInvoice ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="SalesInvoice",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "invoice_no",
                    models.CharField(blank=True, editable=False, max_length=20, unique=True),
                ),
                (
                    "shift",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoices",
                        to="sales.shift",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invoices",
                        to="sales.customer",
                    ),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoices",
                        to="core.employee",
                    ),
                ),
                ("sold_at", models.DateTimeField(default=timezone.now)),
                (
                    "subtotal",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "discount_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "vat_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "total",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "payment_fees",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "net_revenue",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "estimated_cost",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "gross_profit",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("completed", "Completed"),
                            ("partially_returned", "Partially Returned"),
                            ("fully_returned", "Fully Returned"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="completed",
                        max_length=20,
                    ),
                ),
                (
                    "sync_status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("synced", "Synced"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
            ],
            options={
                "db_table": "sales_invoices",
                "ordering": ["-sold_at"],
            },
        ),
        # ── SalesInvoiceItem ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="SalesInvoiceItem",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "invoice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="sales.salesinvoice",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoice_items",
                        to="sales.product",
                    ),
                ),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=12)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "discount_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "vat_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "avg_cost_snapshot",
                    models.DecimalField(decimal_places=4, default=0, max_digits=12),
                ),
                (
                    "line_profit",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
            ],
            options={
                "db_table": "sales_invoice_items",
                "ordering": ["created_at"],
            },
        ),
        # ── CashMovement ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="CashMovement",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "shift",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="cash_movements",
                        to="sales.shift",
                    ),
                ),
                (
                    "movement_type",
                    models.CharField(
                        choices=[
                            ("cash_in", "Cash In"),
                            ("cash_out", "Cash Out"),
                            ("sale", "Sale"),
                            ("refund", "Refund"),
                        ],
                        max_length=20,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("reason", models.TextField(blank=True, default="")),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="cash_movements",
                        to="core.employee",
                    ),
                ),
            ],
            options={
                "db_table": "sales_cash_movements",
                "ordering": ["-created_at"],
            },
        ),
    ]
