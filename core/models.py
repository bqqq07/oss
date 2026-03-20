import uuid

from django.db import models
from django.contrib.auth import get_user_model


class BaseModel(models.Model):
    """Abstract base model with common fields for all models."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Role(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "roles"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Permission(BaseModel):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "permissions"
        ordering = ["codename"]

    def __str__(self):
        return self.codename


class UserRole(BaseModel):
    user = models.ForeignKey(
        "auth.User",
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_roles"
        unique_together = [("user", "role")]
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.user} — {self.role}"


class RolePermission(BaseModel):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "role_permissions"
        unique_together = [("role", "permission")]
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.role} — {self.permission}"


class Employee(BaseModel):
    full_name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, default="")
    job_title = models.CharField(max_length=150, blank=True, default="")
    department = models.CharField(max_length=150, blank=True, default="")
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hire_date = models.DateField(null=True, blank=True)
    user = models.OneToOneField(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )

    class Meta:
        db_table = "employees"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Device(BaseModel):
    DEVICE_TYPES = [
        ("desktop", "Desktop"),
        ("laptop", "Laptop"),
        ("tablet", "Tablet"),
        ("phone", "Phone"),
        ("printer", "Printer"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("available", "Available"),
        ("assigned", "Assigned"),
        ("maintenance", "Maintenance"),
        ("retired", "Retired"),
    ]

    name = models.CharField(max_length=200)
    serial_number = models.CharField(max_length=100, unique=True)
    device_type = models.CharField(max_length=50, choices=DEVICE_TYPES, default="other")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="available")
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchase_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="devices",
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "devices"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class Settings(BaseModel):
    key = models.CharField(max_length=200, unique=True)
    value = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    is_public = models.BooleanField(default=False)

    class Meta:
        db_table = "settings"
        ordering = ["key"]
        verbose_name = "Setting"
        verbose_name_plural = "Settings"

    def __str__(self):
        return self.key


class AuditLog(models.Model):
    """
    Immutable audit trail for create / update / delete actions across the system.

    Not extending BaseModel intentionally: audit records must never be soft-deleted
    or have an updated_at timestamp — they are append-only.
    """

    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_CHOICES = [
        (ACTION_CREATE, "Create"),
        (ACTION_UPDATE, "Update"),
        (ACTION_DELETE, "Delete"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=500)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self):
        return f"{self.action} on {self.model_name}({self.object_id}) by {self.user}"
