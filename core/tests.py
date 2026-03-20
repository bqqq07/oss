import uuid
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from .models import AuditLog, Device, Employee, Permission, Role, RolePermission, Settings, UserRole


class RoleModelTest(TestCase):
    def setUp(self):
        self.role = Role.objects.create(name="Admin", description="Administrator role")

    def test_role_created_with_uuid(self):
        self.assertIsInstance(self.role.id, uuid.UUID)

    def test_role_str(self):
        self.assertEqual(str(self.role), "Admin")

    def test_role_is_active_default_true(self):
        self.assertTrue(self.role.is_active)

    def test_role_has_timestamps(self):
        self.assertIsNotNone(self.role.created_at)
        self.assertIsNotNone(self.role.updated_at)

    def test_role_soft_delete(self):
        self.role.is_active = False
        self.role.save()
        self.assertFalse(Role.objects.get(pk=self.role.pk).is_active)

    def test_role_name_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Role.objects.create(name="Admin")


class PermissionModelTest(TestCase):
    def setUp(self):
        self.permission = Permission.objects.create(
            codename="can_view_reports",
            name="Can View Reports",
        )

    def test_permission_created_with_uuid(self):
        self.assertIsInstance(self.permission.id, uuid.UUID)

    def test_permission_str(self):
        self.assertEqual(str(self.permission), "can_view_reports")

    def test_permission_is_active_default_true(self):
        self.assertTrue(self.permission.is_active)

    def test_permission_has_timestamps(self):
        self.assertIsNotNone(self.permission.created_at)
        self.assertIsNotNone(self.permission.updated_at)

    def test_permission_codename_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Permission.objects.create(codename="can_view_reports", name="Duplicate")


class UserRoleModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="pass")
        self.role = Role.objects.create(name="Manager")
        self.user_role = UserRole.objects.create(user=self.user, role=self.role)

    def test_user_role_created_with_uuid(self):
        self.assertIsInstance(self.user_role.id, uuid.UUID)

    def test_user_role_str(self):
        self.assertIn("testuser", str(self.user_role))
        self.assertIn("Manager", str(self.user_role))

    def test_user_role_is_active_default_true(self):
        self.assertTrue(self.user_role.is_active)

    def test_user_role_has_timestamps(self):
        self.assertIsNotNone(self.user_role.created_at)
        self.assertIsNotNone(self.user_role.updated_at)

    def test_user_role_unique_together(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            UserRole.objects.create(user=self.user, role=self.role)

    def test_user_role_soft_delete(self):
        self.user_role.is_active = False
        self.user_role.save()
        self.assertFalse(UserRole.objects.get(pk=self.user_role.pk).is_active)


class RolePermissionModelTest(TestCase):
    def setUp(self):
        self.role = Role.objects.create(name="Editor")
        self.permission = Permission.objects.create(
            codename="can_edit", name="Can Edit"
        )
        self.role_perm = RolePermission.objects.create(
            role=self.role, permission=self.permission
        )

    def test_role_permission_created_with_uuid(self):
        self.assertIsInstance(self.role_perm.id, uuid.UUID)

    def test_role_permission_str(self):
        self.assertIn("Editor", str(self.role_perm))
        self.assertIn("can_edit", str(self.role_perm))

    def test_role_permission_is_active_default_true(self):
        self.assertTrue(self.role_perm.is_active)

    def test_role_permission_has_timestamps(self):
        self.assertIsNotNone(self.role_perm.created_at)
        self.assertIsNotNone(self.role_perm.updated_at)

    def test_role_permission_unique_together(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            RolePermission.objects.create(role=self.role, permission=self.permission)


class EmployeeModelTest(TestCase):
    def setUp(self):
        self.employee = Employee.objects.create(
            full_name="Ahmed Ali",
            email="ahmed.ali@example.com",
            salary=Decimal("5000.00"),
        )

    def test_employee_created_with_uuid(self):
        self.assertIsInstance(self.employee.id, uuid.UUID)

    def test_employee_str(self):
        self.assertEqual(str(self.employee), "Ahmed Ali")

    def test_employee_full_name_field(self):
        self.assertEqual(self.employee.full_name, "Ahmed Ali")

    def test_employee_is_active_default_true(self):
        self.assertTrue(self.employee.is_active)

    def test_employee_has_timestamps(self):
        self.assertIsNotNone(self.employee.created_at)
        self.assertIsNotNone(self.employee.updated_at)

    def test_employee_salary_is_decimal(self):
        self.assertIsInstance(self.employee.salary, Decimal)

    def test_employee_email_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Employee.objects.create(
                full_name="Other User",
                email="ahmed.ali@example.com",
            )

    def test_employee_soft_delete(self):
        self.employee.is_active = False
        self.employee.save()
        self.assertFalse(Employee.objects.get(pk=self.employee.pk).is_active)


class DeviceModelTest(TestCase):
    def setUp(self):
        self.employee = Employee.objects.create(
            full_name="Sara Hassan",
            email="sara@example.com",
        )
        self.device = Device.objects.create(
            name="Dell Laptop",
            serial_number="SN-001",
            device_type="laptop",
            status="assigned",
            purchase_price=Decimal("1500.00"),
            assigned_to=self.employee,
        )

    def test_device_created_with_uuid(self):
        self.assertIsInstance(self.device.id, uuid.UUID)

    def test_device_str(self):
        self.assertEqual(str(self.device), "Dell Laptop (SN-001)")

    def test_device_is_active_default_true(self):
        self.assertTrue(self.device.is_active)

    def test_device_has_timestamps(self):
        self.assertIsNotNone(self.device.created_at)
        self.assertIsNotNone(self.device.updated_at)

    def test_device_purchase_price_is_decimal(self):
        self.assertIsInstance(self.device.purchase_price, Decimal)

    def test_device_serial_number_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Device.objects.create(name="Other", serial_number="SN-001")

    def test_device_assigned_to_employee(self):
        self.assertEqual(self.device.assigned_to, self.employee)

    def test_device_soft_delete(self):
        self.device.is_active = False
        self.device.save()
        self.assertFalse(Device.objects.get(pk=self.device.pk).is_active)


class SettingsModelTest(TestCase):
    def setUp(self):
        self.setting = Settings.objects.create(
            key="site_name",
            value="My App",
            description="The name of the site",
            is_public=True,
        )

    def test_settings_created_with_uuid(self):
        self.assertIsInstance(self.setting.id, uuid.UUID)

    def test_settings_str(self):
        self.assertEqual(str(self.setting), "site_name")

    def test_settings_is_active_default_true(self):
        self.assertTrue(self.setting.is_active)

    def test_settings_has_timestamps(self):
        self.assertIsNotNone(self.setting.created_at)
        self.assertIsNotNone(self.setting.updated_at)

    def test_settings_key_unique(self):
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Settings.objects.create(key="site_name", value="Other")

    def test_settings_is_public(self):
        self.assertTrue(self.setting.is_public)

    def test_settings_soft_delete(self):
        self.setting.is_active = False
        self.setting.save()
        self.assertFalse(Settings.objects.get(pk=self.setting.pk).is_active)


class AuditLogModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="auditor", password="pass")
        self.log = AuditLog.objects.create(
            user=self.user,
            action=AuditLog.ACTION_CREATE,
            model_name="Product",
            object_id="abc-123",
            object_repr="Product: Vitamin C",
            changes={"name": ["", "Vitamin C"], "price": ["", "25.00"]},
            ip_address="192.168.1.1",
        )

    def test_created_with_uuid(self):
        self.assertIsInstance(self.log.id, uuid.UUID)

    def test_str(self):
        s = str(self.log)
        self.assertIn("create", s)
        self.assertIn("Product", s)
        self.assertIn("abc-123", s)

    def test_has_created_at(self):
        self.assertIsNotNone(self.log.created_at)

    def test_no_updated_at(self):
        self.assertFalse(hasattr(self.log, "updated_at"))

    def test_no_is_active(self):
        self.assertFalse(hasattr(self.log, "is_active"))

    def test_changes_is_dict(self):
        self.assertIsInstance(self.log.changes, dict)

    def test_ip_address_stored(self):
        self.assertEqual(self.log.ip_address, "192.168.1.1")

    def test_user_set_null_on_user_delete(self):
        self.user.delete()
        self.log.refresh_from_db()
        self.assertIsNone(self.log.user)

    def test_action_choices(self):
        actions = [c[0] for c in AuditLog.ACTION_CHOICES]
        self.assertIn("create", actions)
        self.assertIn("update", actions)
        self.assertIn("delete", actions)

    def test_changes_default_empty_dict(self):
        log = AuditLog.objects.create(
            action=AuditLog.ACTION_DELETE,
            model_name="Role",
            object_id="xyz-999",
            object_repr="Role: Admin",
        )
        self.assertEqual(log.changes, {})
