'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import Link from 'next/link';
import { Supplier, Product, PurchaseFormData } from '@/types';

export default function NewPurchasePage() {
  const canCreate = usePermission('purchases.create');

  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    defaultValues: {
      items: [{ product: '', quantity: 1, unit_cost: 0 }],
      paid_amount: 0,
      invoice_date: new Date().toISOString().split('T')[0],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!canCreate) return;
    Promise.all([
      api.get<{ results: Supplier[] }>('/suppliers/?page_size=200'),
      api.get<{ results: Product[] }>('/products/?page_size=500&is_active=true'),
    ]).then(([suppRes, prodRes]) => {
      setSuppliers(suppRes.data.results);
      setProducts(prodRes.data.results);
    });
  }, [canCreate]);

  const watchedItems = watch('items');

  const totalAmount = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
    0
  );

  const onSubmit = async (data: PurchaseFormData) => {
    setSaving(true);
    setServerError(null);
    try {
      await api.post('/purchases/', data);
      router.push('/admin/purchases');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setServerError(axiosErr?.response?.data?.detail ?? 'حدث خطأ، يرجى المحاولة مرة أخرى');
      setSaving(false);
    }
  };

  if (!canCreate) return <AccessDenied />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/purchases" className="text-gray-400 hover:text-gray-600">
          ← فواتير الشراء
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">فاتورة شراء جديدة</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Header info */}
        <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المورد *</label>
            <select
              {...register('supplier', { required: 'المورد مطلوب' })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">اختر المورد</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.supplier && <p className="text-red-500 text-xs mt-1">{errors.supplier.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الفاتورة *</label>
            <input
              type="date"
              {...register('invoice_date', { required: 'التاريخ مطلوب' })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {errors.invoice_date && <p className="text-red-500 text-xs mt-1">{errors.invoice_date.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">أصناف الفاتورة</h2>
            <button
              type="button"
              onClick={() => append({ product: '', quantity: 1, unit_cost: 0 })}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + إضافة صنف
            </button>
          </div>

          <div className="p-5 space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-start">
                <div className="flex-1">
                  <select
                    {...register(`items.${index}.product`, { required: 'المنتج مطلوب' })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">اختر المنتج</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    placeholder="الكمية"
                    {...register(`items.${index}.quantity`, { required: true, min: 1, valueAsNumber: true })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="سعر الوحدة"
                    {...register(`items.${index}.unit_cost`, { required: true, min: 0, valueAsNumber: true })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="w-28 py-2 text-sm text-gray-600 font-mono">
                  {(
                    (Number(watchedItems[index]?.quantity) || 0) *
                    (Number(watchedItems[index]?.unit_cost) || 0)
                  ).toLocaleString('ar-SA')}
                  ر.س
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="py-2 text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">الإجمالي</span>
              <span className="font-bold font-mono">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap">المبلغ المدفوع</label>
              <input
                type="number"
                min="0"
                step="0.01"
                {...register('paid_amount', { min: 0, valueAsNumber: true })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المتبقي</span>
              <span className={`font-bold font-mono ${totalAmount - (Number(watch('paid_amount')) || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Math.max(0, totalAmount - (Number(watch('paid_amount')) || 0)).toLocaleString('ar-SA')} ر.س
              </span>
            </div>
          </div>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ❌ {serverError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ الفاتورة'}
          </button>
          <Link
            href="/admin/purchases"
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  );
}
