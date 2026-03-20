'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import { Expense, ExpenseFormData, ExpenseCategory, PaginatedResponse } from '@/types';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'إيجار',
  utilities: 'مرافق',
  salaries: 'رواتب',
  supplies: 'مستلزمات',
  maintenance: 'صيانة',
  marketing: 'تسويق',
  other: 'أخرى',
};
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  rent: 'bg-blue-100 text-blue-700',
  utilities: 'bg-yellow-100 text-yellow-700',
  salaries: 'bg-purple-100 text-purple-700',
  supplies: 'bg-green-100 text-green-700',
  maintenance: 'bg-orange-100 text-orange-700',
  marketing: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function ExpensesPage() {
  const canView = usePermission('expenses.view');
  const canCreate = usePermission('expenses.create');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [totalThisMonth, setTotalThisMonth] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      category: 'other',
    },
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page_size: 100 };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const { data } = await api.get<PaginatedResponse<Expense>>('/expenses/', { params });
      setExpenses(data.results);

      // Calculate this month total
      const now = new Date();
      const monthTotal = data.results
        .filter((e) => {
          const d = new Date(e.expense_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, e) => sum + e.amount, 0);
      setTotalThisMonth(monthTotal);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (canView) fetchExpenses();
  }, [canView, fetchExpenses]);

  const onSubmit = async (data: ExpenseFormData) => {
    setSaving(true);
    setServerError(null);
    try {
      await api.post('/expenses/', data);
      setShowForm(false);
      reset({ expense_date: new Date().toISOString().split('T')[0], category: 'other' });
      fetchExpenses();
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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المصاريف</h1>
          <p className="text-sm text-gray-500 mt-1">
            إجمالي الشهر الحالي:{' '}
            <span className="font-bold text-red-600">{totalThisMonth.toLocaleString('ar-SA')} ر.س</span>
          </p>
        </div>
        {canCreate && !showForm && (
          <button
            onClick={() => { setShowForm(true); setServerError(null); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            + إضافة مصروف
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">إضافة مصروف جديد</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
              <input
                {...register('title', { required: 'العنوان مطلوب' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('amount', { required: 'المبلغ مطلوب', min: 0 })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة *</label>
              <select
                {...register('category', { required: true })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
              <input
                type="date"
                {...register('expense_date', { required: 'التاريخ مطلوب' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {errors.expense_date && <p className="text-red-500 text-xs mt-1">{errors.expense_date.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
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

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${categoryFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
        >
          الكل
        </button>
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setCategoryFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${categoryFilter === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">جارٍ التحميل...</div>
        ) : expenses.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-400">لا توجد مصاريف</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">التاريخ</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">العنوان</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الفئة</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(e.expense_date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {e.title}
                    {e.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{e.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[e.category]}`}>
                      {CATEGORY_LABELS[e.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-red-600">
                    {e.amount.toLocaleString('ar-SA')} ر.س
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
