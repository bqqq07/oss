'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import Link from 'next/link';
import { Product, ProductFormData } from '@/types';

const UNITS = ['قطعة', 'عبوة', 'كيلو', 'لتر', 'مل', 'غرام'];
const CATEGORIES = ['عناية بالبشرة', 'عناية بالشعر', 'عطور', 'مكياج', 'أخرى'];

export default function ProductDetailPage() {
  const canView = usePermission('products.view');
  const canEdit = usePermission('products.edit');

  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: { is_active: true, min_stock_level: 5 },
  });

  useEffect(() => {
    if (!isNew && canView) {
      api
        .get<Product>(`/products/${id}/`)
        .then(({ data }) => {
          setProduct(data);
          reset({
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            category: data.category,
            brand: data.brand,
            unit: data.unit,
            cost_price: data.cost_price,
            selling_price: data.selling_price,
            min_stock_level: data.min_stock_level,
            is_active: data.is_active,
          });
        })
        .catch(() => router.push('/admin/products'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew, canView, reset, router]);

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    setServerError(null);
    try {
      if (isNew) {
        await api.post('/products/', data);
      } else {
        await api.patch(`/products/${id}/`, data);
      }
      setSuccess(true);
      setTimeout(() => router.push('/admin/products'), 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setServerError(axiosErr?.response?.data?.detail ?? 'حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  if (!canView) return <AccessDenied />;
  if (loading) return <div className="py-16 text-center text-gray-400">جارٍ التحميل...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-gray-400 hover:text-gray-600">
          ← المنتجات
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">
          {isNew ? 'إضافة منتج جديد' : `تعديل: ${product?.name}`}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج *</label>
            <input
              {...register('name', { required: 'الاسم مطلوب' })}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كود المنتج (SKU) *</label>
            <input
              {...register('sku', { required: 'SKU مطلوب' })}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">باركود</label>
            <input
              {...register('barcode')}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الفئة *</label>
            <select
              {...register('category', { required: 'الفئة مطلوبة' })}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            >
              <option value="">اختر الفئة</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الماركة</label>
            <input
              {...register('brand')}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وحدة القياس *</label>
            <select
              {...register('unit', { required: 'الوحدة مطلوبة' })}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            >
              <option value="">اختر الوحدة</option>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
            {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('cost_price', { required: 'سعر التكلفة مطلوب', min: 0 })}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            />
            {errors.cost_price && <p className="text-red-500 text-xs mt-1">{errors.cost_price.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('selling_price', { required: 'سعر البيع مطلوب', min: 0 })}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            />
            {errors.selling_price && <p className="text-red-500 text-xs mt-1">{errors.selling_price.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للمخزون</label>
            <input
              type="number"
              min="0"
              {...register('min_stock_level', { min: 0 })}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
            />
          </div>

          <div className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              disabled={!canEdit}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              منتج نشط
            </label>
          </div>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            ❌ {serverError}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
            ✅ تم الحفظ بنجاح، جارٍ التحويل...
          </div>
        )}

        {canEdit && (
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <Link
              href="/admin/products"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              إلغاء
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
