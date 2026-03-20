"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSaleByInvoice, createReturn, getCurrentShift, tokenStorage } from "@/lib/api";
import type { Sale, Shift, ReturnItem, PaymentMethod } from "@/types";

type ReturnLine = ReturnItem & {
  productName: string;
  maxQty: number;
  selected: boolean;
};

const REFUND_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "نقداً" },
  { value: "mada", label: "مدى" },
  { value: "visa", label: "فيزا" },
];

export default function ReturnPage() {
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [invoiceNum, setInvoiceNum] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      }
    });
  }, [router]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceNum.trim()) return;
    setSearching(true);
    setError("");
    setSale(null);
    setLines([]);
    try {
      const found = await getSaleByInvoice(invoiceNum.trim());
      setSale(found);
      setLines(
        (found.items as Array<{ sale_item?: string; product: string | { id: string; name: string }; qty: number; unit_price: number; total: number }>).map((item) => ({
          sale_item: item.sale_item ?? "",
          product:
            typeof item.product === "object" ? item.product.id : item.product,
          productName:
            typeof item.product === "object" ? item.product.name : item.product,
          qty: item.qty,
          unit_price: item.unit_price,
          total: item.total,
          maxQty: item.qty,
          selected: false,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "لم يتم العثور على الفاتورة");
    } finally {
      setSearching(false);
    }
  }

  function toggleLine(idx: number) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, selected: !l.selected } : l))
    );
  }

  function updateQty(idx: number, qty: number) {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              qty: Math.min(Math.max(1, qty), l.maxQty),
              total: Math.min(Math.max(1, qty), l.maxQty) * l.unit_price,
            }
          : l
      )
    );
  }

  const selected = lines.filter((l) => l.selected);
  const returnTotal = selected.reduce((s, l) => s + l.total, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sale || !shift || selected.length === 0) return;
    if (!reason.trim()) { setError("أدخل سبب المرتجع"); return; }
    setLoading(true);
    setError("");
    try {
      await createReturn({
        sale: sale.id,
        shift: shift.id,
        items: selected.map((l) => ({
          sale_item: l.sale_item,
          product: l.product,
          qty: l.qty,
          unit_price: l.unit_price,
          total: l.total,
        })),
        reason,
        refund_method: refundMethod,
        total: returnTotal,
      });
      setSuccess(
        `تم المرتجع بنجاح — إجمالي المسترد: ${returnTotal.toFixed(2)} ر.س`
      );
      setSale(null);
      setLines([]);
      setInvoiceNum("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إتمام المرتجع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">مرتجع مبيعات</h1>

      {/* Invoice search */}
      <form onSubmit={handleSearch} className="card mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          رقم الفاتورة
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={invoiceNum}
            onChange={(e) => setInvoiceNum(e.target.value)}
            placeholder="أدخل رقم الفاتورة..."
            className="input flex-1"
            autoFocus
          />
          <button
            type="submit"
            disabled={searching}
            className="btn-primary px-6"
          >
            {searching ? "بحث..." : "بحث"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-xl mb-4 font-semibold">
          ✓ {success}
          <button
            onClick={() => setSuccess("")}
            className="block mt-2 text-sm text-green-600 underline"
          >
            مرتجع جديد
          </button>
        </div>
      )}

      {sale && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sale info */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                فاتورة #{sale.invoice_number}
              </span>
              <span className="font-bold text-blue-700">
                {sale.total.toFixed(2)} ر.س
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(sale.created_at).toLocaleString("ar-SA")}
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3">
              اختر الأصناف المراد إرجاعها
            </h3>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleLine(idx)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    line.selected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      line.selected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                    }`}
                  >
                    {line.selected && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{line.productName}</div>
                    <div className="text-xs text-gray-500">
                      سعر الوحدة: {line.unit_price.toFixed(2)} ر.س
                    </div>
                  </div>
                  {line.selected && (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => updateQty(idx, line.qty - 1)}
                        className="w-7 h-7 bg-gray-200 rounded-full font-bold hover:bg-gray-300"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-bold">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(idx, line.qty + 1)}
                        className="w-7 h-7 bg-blue-100 rounded-full text-blue-700 font-bold hover:bg-blue-200"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-500">
                        / {line.maxQty}
                      </span>
                    </div>
                  )}
                  <div className="text-sm font-bold text-gray-700 w-16 text-left">
                    {line.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selected.length > 0 && (
            <>
              {/* Reason */}
              <div className="card">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب المرتجع <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="مثال: منتج تالف، خطأ في الطلب..."
                />
              </div>

              {/* Refund method */}
              <div className="card">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  طريقة الاسترداد
                </label>
                <div className="flex gap-2">
                  {REFUND_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setRefundMethod(m.value)}
                      className={`flex-1 py-2 rounded-lg font-semibold border-2 ${
                        refundMethod === m.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total & submit */}
              <div className="card flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm">إجمالي المسترد</div>
                  <div className="text-2xl font-extrabold text-red-600">
                    {returnTotal.toFixed(2)} ر.س
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-danger px-8 py-3 text-base"
                >
                  {loading ? "جارٍ المعالجة..." : "تأكيد المرتجع"}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}
