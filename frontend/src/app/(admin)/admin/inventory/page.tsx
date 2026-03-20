'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import { InventoryItem, InventoryMovement, PaginatedResponse } from '@/types';

const MOVEMENT_LABELS: Record<string, string> = {
  in: 'وارد',
  out: 'صادر',
  adjustment: 'تسوية',
};
const MOVEMENT_COLORS: Record<string, string> = {
  in: 'bg-green-100 text-green-700',
  out: 'bg-red-100 text-red-700',
  adjustment: 'bg-blue-100 text-blue-700',
};

type Tab = 'stock' | 'movements';

export default function InventoryPage() {
  const canView = usePermission('inventory.view');

  const [tab, setTab] = useState<Tab>('stock');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [movPage, setMovPage] = useState(1);
  const [movTotal, setMovTotal] = useState(0);
  const MOV_PAGE_SIZE = 20;

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean> = {};
      if (search) params.search = search;
      if (lowStockOnly) params.is_low_stock = true;
      const { data } = await api.get<PaginatedResponse<InventoryItem>>('/inventory/', { params });
      setItems(data.results);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: movPage,
        page_size: MOV_PAGE_SIZE,
      };
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<InventoryMovement>>('/inventory/movements/', { params });
      setMovements(data.results);
      setMovTotal(data.count);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [movPage, search]);

  useEffect(() => {
    if (!canView) return;
    if (tab === 'stock') fetchStock();
    else fetchMovements();
  }, [canView, tab, fetchStock, fetchMovements]);

  if (!canView) return <AccessDenied />;

  const movTotalPages = Math.ceil(movTotal / MOV_PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">المخزون</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('stock')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === 'stock' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
        >
          مستوى المخزون
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === 'movements' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
        >
          حركات المخزون
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center mb-4">
        <input
          type="text"
          placeholder="بحث بالمنتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {tab === 'stock' && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded"
            />
            منخفض المخزون فقط
          </label>
        )}
      </div>

      {/* Stock Tab */}
      {tab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16 text-gray-400">جارٍ التحميل...</div>
          ) : items.length === 0 ? (
            <div className="flex justify-center py-16 text-gray-400">لا توجد بيانات</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">المنتج</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">SKU</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">المخزون الحالي</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">الحد الأدنى</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.product_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{item.sku}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${item.is_low_stock ? 'text-red-600' : 'text-gray-800'}`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.min_stock_level}</td>
                    <td className="px-4 py-3">
                      {item.is_low_stock ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          ⚠️ منخفض
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          طبيعي
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {tab === 'movements' && (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16 text-gray-400">جارٍ التحميل...</div>
            ) : movements.length === 0 ? (
              <div className="flex justify-center py-16 text-gray-400">لا توجد حركات</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">التاريخ</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">المنتج</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">النوع</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">الكمية</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">المرجع</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(m.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{m.product_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MOVEMENT_COLORS[m.movement_type]}`}>
                          {MOVEMENT_LABELS[m.movement_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className={m.movement_type === 'out' ? 'text-red-600' : 'text-green-600'}>
                          {m.movement_type === 'out' ? '-' : '+'}{m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{m.reference || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {movTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>
                عرض {(movPage - 1) * MOV_PAGE_SIZE + 1}–{Math.min(movPage * MOV_PAGE_SIZE, movTotal)} من {movTotal}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setMovPage((p) => Math.max(1, p - 1))}
                  disabled={movPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => setMovPage((p) => Math.min(movTotalPages, p + 1))}
                  disabled={movPage === movTotalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
