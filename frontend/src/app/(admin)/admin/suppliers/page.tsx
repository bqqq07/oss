'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import { Supplier, SupplierFormData, PaginatedResponse } from '@/types';

export default function SuppliersPage() {
  const canView = usePermission('suppliers.view');
  const canCreate = usePermission('suppliers.create');
  const canEdit = usePermission('suppliers.edit');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({ defaultValues: { is_active: true } });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page_size: 100 };
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<Supplier>>('/suppliers/', { params });
      setSuppliers(data.results);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (canView) fetchSuppliers();
  }, [canView, fetchSuppliers]);

  const openCreate = () => {
    setEditing(null);
    reset({ is_active: true });
    setShowForm(true);
    setServerError(null);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    reset({
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      tax_number: s.tax_number,
      notes: s.notes,
      is_active: s.is_active,
    });
    setShowForm(true);
    setServerError(null);
  };

  const onSubmit = async (data: SupplierFormData) => {
    setSaving(true);
    setServerError(null);
    try {
      if (editing) {
        await api.patch(`/suppliers/${editing.id}/`, data);
      } else {
        await api.post('/suppliers/', data);
      }
      setShowForm(false);
      fetchSuppliers();
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
        <h1 className="text-2xl font-bold text-gray-800">الموردون</h1>
        {canCreate && !showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            + إضافة مورد
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            {editing ? 'تعديل المورد' : 'إضافة مورد جديد'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المورد *</label>
              <input
                {...register('name', { required: 'الاسم مطلوب' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input
                {...register('phone')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                {...register('email')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي</label>
              <input
                {...register('tax_number')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <input
                {...register('address')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="s_active" {...register('is_active')} className="rounded" />
              <label htmlFor="s_active" className="text-sm text-gray-700">مورد نشط</label>
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
          placeholder="بحث باسم المورد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">جارٍ التحميل...</div>
        ) : suppliers.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-400">لا يوجد موردون</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الاسم</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الهاتف</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">البريد</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الرقم الضريبي</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الحالة</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.tax_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(s)} className="text-indigo-600 hover:underline text-xs">
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
