'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import { Purchase, PaginatedResponse } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'في الانتظار',
  received: 'مستلم',
  cancelled: 'ملغي',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function PurchasesPage() {
  const canView = usePermission('purchases.view');
  const canCreate = usePermission('purchases.create');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (status !== 'all') params.status = status;

      const { data } = await api.get<PaginatedResponse<Purchase>>('/purchases/', { params });
      setPurchases(data.results);
      setTotalCount(data.count);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    if (canView) fetchPurchases();
  }, [canView, fetchPurchases]);

  useEffect(() => { setPage(1); }, [search, status]);

  if (!canView) return <AccessDenied />;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">فواتير الشراء</h1>
        {canCreate && (
          <Link
            href="/admin/purchases/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            + فاتورة جديدة
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="بحث برقم الفاتورة أو المورد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">في الانتظار</option>
          <option value="received">مستلم</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">جارٍ التحميل...</div>
        ) : purchases.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-400">لا توجد فواتير</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">رقم الفاتورة</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">المورد</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">التاريخ</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الإجمالي</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">المدفوع</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-indigo-600">{p.invoice_number}</td>
                  <td className="px-4 py-3">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(p.invoice_date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {p.total_amount.toLocaleString('ar-SA')} ر.س
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {p.paid_amount.toLocaleString('ar-SA')} ر.س
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} من {totalCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              السابق
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
