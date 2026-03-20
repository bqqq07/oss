'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import { Employee, EmployeeFormData, PaginatedResponse } from '@/types';

const DEPARTMENTS = ['إدارة', 'مبيعات', 'مخزن', 'محاسبة', 'أخرى'];

export default function EmployeesPage() {
  const canView = usePermission('employees.view');
  const canCreate = usePermission('employees.create');
  const canEdit = usePermission('employees.edit');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({ defaultValues: { is_active: true, salary: 0 } });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page_size: 100 };
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees/', { params });
      setEmployees(data.results);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (canView) fetchEmployees();
  }, [canView, fetchEmployees]);

  const openCreate = () => {
    setEditing(null);
    reset({ is_active: true, salary: 0 });
    setShowForm(true);
    setServerError(null);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    reset({
      full_name: e.full_name,
      email: e.email,
      phone: e.phone,
      job_title: e.job_title,
      department: e.department,
      salary: e.salary,
      hire_date: e.hire_date,
      is_active: e.is_active,
    });
    setShowForm(true);
    setServerError(null);
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setSaving(true);
    setServerError(null);
    try {
      if (editing) {
        await api.patch(`/employees/${editing.id}/`, data);
      } else {
        await api.post('/employees/', data);
      }
      setShowForm(false);
      fetchEmployees();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setServerError(axiosErr?.response?.data?.detail ?? 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  if (!canView) return <AccessDenied />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">الموظفون</h1>
        {canCreate && !showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            + إضافة موظف
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            {editing ? 'تعديل الموظف' : 'إضافة موظف جديد'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
              <input
                {...register('full_name', { required: 'الاسم مطلوب' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
              <input
                type="email"
                {...register('email', { required: 'البريد مطلوب' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input
                {...register('phone')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المسمى الوظيفي</label>
              <input
                {...register('job_title')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
              <select
                {...register('department')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">اختر القسم</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الراتب *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('salary', { required: 'الراتب مطلوب', min: 0 })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التوظيف</label>
              <input
                type="date"
                {...register('hire_date')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex items-center gap-2 self-end pb-2">
              <input type="checkbox" id="e_active" {...register('is_active')} className="rounded" />
              <label htmlFor="e_active" className="text-sm text-gray-700">موظف نشط</label>
            </div>

            {serverError && (
              <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                ❌ {serverError}
              </div>
            )}

            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="بحث باسم الموظف أو البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">جارٍ التحميل...</div>
        ) : employees.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-400">لا يوجد موظفون</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الاسم</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">البريد</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">القسم</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">المسمى</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الراتب</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الحالة</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{e.email}</td>
                  <td className="px-4 py-3 text-gray-500">{e.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.job_title || '—'}</td>
                  <td className="px-4 py-3 font-mono">{e.salary.toLocaleString('ar-SA')} ر.س</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(e)} className="text-indigo-600 hover:underline text-xs">
                        تعديل
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
