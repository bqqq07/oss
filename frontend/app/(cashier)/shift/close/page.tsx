"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentShift, closeShift, tokenStorage, logout } from "@/lib/api";
import type { Shift } from "@/types";

export default function ShiftClosePage() {
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [closed, setClosed] = useState(false);
  const [closedShift, setClosedShift] = useState<Shift | null>(null);

  useEffect(() => {
    if (!tokenStorage.getAccess()) {
      router.replace("/cashier/login");
      return;
    }
    getCurrentShift().then((s) => {
      if (!s || s.status !== "open") {
        router.replace("/cashier/shift/open");
      } else {
        setShift(s);
        setChecking(false);
      }
    });
  }, [router]);

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      setError("أدخل مبلغاً صحيحاً");
      return;
    }
    if (!shift) return;
    setLoading(true);
    setError("");
    try {
      const result = await closeShift(shift.id, {
        closing_cash: amount,
        notes: notes.trim() || undefined,
      });
      setClosedShift(result);
      setClosed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إغلاق الشفت");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 animate-pulse">جارٍ التحقق...</div>
      </div>
    );
  }

  if (closed && closedShift) {
    const duration = closedShift.closed_at && closedShift.opened_at
      ? Math.round(
          (new Date(closedShift.closed_at).getTime() -
            new Date(closedShift.opened_at).getTime()) /
            60000
        )
      : null;

    return (
      <div className="max-w-md mx-auto p-4 mt-8">
        <div className="card text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            تم إغلاق الشفت
          </h2>
          <p className="text-gray-500 mb-6">
            {new Date().toLocaleString("ar-SA")}
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm mb-6">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500">رصيد الافتتاح</div>
              <div className="font-bold text-lg">
                {closedShift.opening_cash?.toFixed(2)} ر.س
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500">رصيد الإغلاق</div>
              <div className="font-bold text-lg">
                {closedShift.closing_cash?.toFixed(2)} ر.س
              </div>
            </div>
            {closedShift.total_sales != null && (
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-gray-500">إجمالي المبيعات</div>
                <div className="font-bold text-lg text-green-700">
                  {closedShift.total_sales.toFixed(2)} ر.س
                </div>
              </div>
            )}
            {closedShift.total_returns != null && (
              <div className="bg-red-50 rounded-xl p-3">
                <div className="text-gray-500">إجمالي المرتجعات</div>
                <div className="font-bold text-lg text-red-600">
                  {closedShift.total_returns.toFixed(2)} ر.س
                </div>
              </div>
            )}
            {duration != null && (
              <div className="col-span-2 bg-blue-50 rounded-xl p-3">
                <div className="text-gray-500">مدة الشفت</div>
                <div className="font-bold text-lg text-blue-700">
                  {Math.floor(duration / 60)}س {duration % 60}د
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => logout()}
            className="btn-primary w-full py-3"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 mt-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إغلاق الشفت</h1>

      {/* Shift info */}
      {shift && (
        <div className="card bg-blue-50 border-blue-200 mb-4 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">وقت الفتح</span>
            <span className="font-semibold">
              {new Date(shift.opened_at).toLocaleString("ar-SA")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">رصيد الافتتاح</span>
            <span className="font-bold text-blue-700">
              {shift.opening_cash.toFixed(2)} ر.س
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleClose} className="space-y-4">
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رصيد الصندوق الفعلي (ريال)
          </label>
          <input
            type="number"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            className="input text-2xl text-center font-bold"
            placeholder="0.00"
            min="0"
            step="0.01"
            autoFocus
            required
          />

          {/* Quick buttons */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[100, 200, 500, 1000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setClosingCash(String(v))}
                className="py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ملاحظات (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={2}
            placeholder="أي ملاحظات على هذا الشفت..."
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/cashier/pos")}
            className="btn-secondary flex-1"
          >
            رجوع للبيع
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-danger flex-1 py-3"
          >
            {loading ? "جارٍ الإغلاق..." : "إغلاق الشفت"}
          </button>
        </div>
      </form>
    </div>
  );
}
