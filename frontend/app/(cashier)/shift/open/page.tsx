"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { openShift, getCurrentShift, tokenStorage } from "@/lib/api";

export default function ShiftOpenPage() {
  const router = useRouter();
  const [openingCash, setOpeningCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!tokenStorage.getAccess()) {
      router.replace("/cashier/login");
      return;
    }
    getCurrentShift().then((shift) => {
      if (shift?.status === "open") {
        router.replace("/cashier/pos");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      setError("أدخل مبلغاً صحيحاً");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await openShift({ opening_cash: amount });
      router.replace("/cashier/pos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل فتح الشفت");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-blue-700 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">جارٍ التحقق...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-gray-800">فتح شفت جديد</h1>
          <p className="text-gray-500 text-sm mt-1">أدخل رصيد الصندوق الافتتاحي</p>
        </div>

        <form onSubmit={handleOpen} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رصيد الصندوق (ريال)
            </label>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="input text-2xl text-center font-bold"
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
              required
            />
          </div>

          {/* Quick amount buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[200, 500, 1000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setOpeningCash(String(amount))}
                className="py-2 border-2 border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors"
              >
                {amount.toLocaleString("ar-SA")}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-success w-full text-lg py-3"
          >
            {loading ? "جارٍ الفتح..." : "فتح الشفت"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/cashier/login")}
            className="btn-secondary w-full text-sm"
          >
            رجوع لتسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
