"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  searchProducts,
  searchCustomers,
  getCurrentShift,
  createSale,
  tokenStorage,
} from "@/lib/api";
import { printReceipt } from "@/lib/receipt";
import type {
  Product,
  Customer,
  CartItem,
  PaymentSplit,
  Shift,
  Sale,
} from "@/types";

// ─── Numpad ────────────────────────────────────────────────────────────────
function Numpad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-1">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => onKey(k)}
          className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg py-3 text-lg font-semibold transition-colors"
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ─── Discount Modal ────────────────────────────────────────────────────────
function DiscountModal({
  label,
  current,
  onApply,
  onClose,
}: {
  label: string;
  current: number;
  onApply: (pct: number, amt: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"pct" | "amt">("pct");
  const [value, setValue] = useState(current > 0 ? String(current) : "");

  function apply() {
    const num = parseFloat(value) || 0;
    if (mode === "pct") onApply(Math.min(num, 100), 0);
    else onApply(0, num);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-72 p-6">
        <h3 className="font-bold text-lg mb-4 text-center">{label}</h3>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("pct")}
            className={`flex-1 py-2 rounded-lg font-semibold ${mode === "pct" ? "bg-blue-700 text-white" : "bg-gray-100"}`}
          >
            نسبة %
          </button>
          <button
            onClick={() => setMode("amt")}
            className={`flex-1 py-2 rounded-lg font-semibold ${mode === "amt" ? "bg-blue-700 text-white" : "bg-gray-100"}`}
          >
            مبلغ ر.س
          </button>
        </div>
        <div className="text-3xl font-bold text-center bg-gray-50 border rounded-lg py-3 mb-4 min-h-[56px]">
          {value || "0"}
          {mode === "pct" ? "%" : " ر.س"}
        </div>
        <Numpad
          onKey={(k) => {
            if (k === "⌫") setValue((v) => v.slice(0, -1));
            else if (k === "." && value.includes(".")) return;
            else setValue((v) => (v === "0" ? k : v + k));
          }}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            إلغاء
          </button>
          <button onClick={apply} className="btn-primary flex-1">
            تطبيق
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────
function PaymentModal({
  total,
  onConfirm,
  onClose,
}: {
  total: number;
  onConfirm: (split: PaymentSplit) => void;
  onClose: () => void;
}) {
  const [split, setSplit] = useState<PaymentSplit>({ cash: total, mada: 0, visa: 0 });
  const [active, setActive] = useState<keyof PaymentSplit>("cash");
  const [numVal, setNumVal] = useState(String(total));

  const paid = split.cash + split.mada + split.visa;
  const remaining = total - paid;

  function applyNum() {
    const val = parseFloat(numVal) || 0;
    setSplit((s) => {
      const newSplit = { ...s, [active]: val };
      // Recalculate other fields to not exceed total
      return newSplit;
    });
  }

  function handleKey(k: string) {
    if (k === "⌫") setNumVal((v) => v.slice(0, -1) || "0");
    else if (k === "." && numVal.includes(".")) return;
    else setNumVal((v) => (v === "0" ? k : v + k));
  }

  function selectMethod(m: keyof PaymentSplit) {
    setActive(m);
    setNumVal(String(split[m]));
  }

  useEffect(() => {
    const val = parseFloat(numVal) || 0;
    setSplit((s) => ({ ...s, [active]: val }));
  }, [numVal, active]);

  const labels: Record<keyof PaymentSplit, string> = {
    cash: "نقداً",
    mada: "مدى",
    visa: "فيزا",
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-6">
        <h3 className="font-bold text-xl mb-2 text-center">الدفع</h3>
        <div className="text-center text-3xl font-bold text-blue-700 mb-4">
          {total.toFixed(2)} ر.س
        </div>

        {/* Method tabs */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(labels) as (keyof PaymentSplit)[]).map((m) => (
            <button
              key={m}
              onClick={() => selectMethod(m)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm ${active === m ? "bg-blue-700 text-white" : "bg-gray-100"}`}
            >
              {labels[m]}
            </button>
          ))}
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
          {(Object.keys(labels) as (keyof PaymentSplit)[]).map((m) => (
            <div
              key={m}
              onClick={() => selectMethod(m)}
              className={`p-2 rounded-lg cursor-pointer border-2 ${active === m ? "border-blue-700 bg-blue-50" : "border-gray-200"}`}
            >
              <div className="text-gray-500">{labels[m]}</div>
              <div className="font-bold">{split[m].toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="text-2xl font-bold text-center bg-gray-50 border rounded-lg py-2 mb-3 min-h-[48px]">
          {numVal} ر.س
        </div>

        <Numpad onKey={handleKey} />

        <div
          className={`mt-3 text-center font-semibold ${remaining > 0.01 ? "text-red-600" : remaining < -0.01 ? "text-green-600" : "text-gray-600"}`}
        >
          {remaining > 0.01
            ? `متبقي: ${remaining.toFixed(2)} ر.س`
            : remaining < -0.01
            ? `الباقي للعميل: ${Math.abs(remaining).toFixed(2)} ر.س`
            : "المبلغ مكتمل ✓"}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(split)}
            disabled={paid < total - 0.01}
            className="btn-success flex-1"
          >
            تأكيد الدفع
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main POS Page ─────────────────────────────────────────────────────────
export default function POSPage() {
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState({ pct: 0, amt: 0 });
  const [discountModal, setDiscountModal] = useState<{
    target: "invoice" | number;
  } | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard
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
    searchRef.current?.focus();
  }, [router]);

  // ─── Product search with debounce ────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchProducts(q);
      setSearchResults(Array.isArray(results) ? results : [results]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(q), 180); // < 200ms
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchResults.length === 1) {
      addToCart(searchResults[0]);
    }
  }

  // ─── Customer search ─────────────────────────────────────────────────────
  const customerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleCustomerSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setCustomerSearch(q);
    if (customerTimer.current) clearTimeout(customerTimer.current);
    customerTimer.current = setTimeout(async () => {
      if (!q.trim()) { setCustomerResults([]); return; }
      try {
        const res = await searchCustomers(q);
        setCustomerResults(res);
      } catch { setCustomerResults([]); }
    }, 180);
  }

  // ─── Cart operations ─────────────────────────────────────────────────────
  function calcItemTotal(item: CartItem): number {
    const base = item.qty * item.unitPrice;
    const discAmt = item.discountAmt || (base * item.discountPct) / 100;
    return Math.max(0, base - discAmt);
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.product.id === product.id);
      if (existing >= 0) {
        return prev.map((item, idx) =>
          idx === existing
            ? { ...item, qty: item.qty + 1, total: calcItemTotal({ ...item, qty: item.qty + 1 }) }
            : item
        );
      }
      const newItem: CartItem = {
        product,
        qty: 1,
        unitPrice: product.price,
        discountPct: 0,
        discountAmt: 0,
        total: product.price,
      };
      return [...prev, newItem];
    });
    setSearch("");
    setSearchResults([]);
    searchRef.current?.focus();
  }

  function updateQty(idx: number, delta: number) {
    setCart((prev) => {
      const item = { ...prev[idx], qty: Math.max(1, prev[idx].qty + delta) };
      item.total = calcItemTotal(item);
      return prev.map((i, ix) => (ix === idx ? item : i));
    });
  }

  function removeFromCart(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  function applyItemDiscount(idx: number, pct: number, amt: number) {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, discountPct: pct, discountAmt: amt };
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
    setDiscountModal(null);
  }

  // ─── Totals ───────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const invoiceDiscAmt =
    invoiceDiscount.amt || (subtotal * invoiceDiscount.pct) / 100;
  const grandTotal = Math.max(0, subtotal - invoiceDiscAmt);

  // ─── Submit sale ──────────────────────────────────────────────────────────
  async function handlePaymentConfirm(split: PaymentSplit) {
    if (!shift || cart.length === 0) return;
    setLoading(true);
    setPaymentModal(false);
    try {
      const payments = (
        [
          { method: "cash" as const, amount: split.cash },
          { method: "mada" as const, amount: split.mada },
          { method: "visa" as const, amount: split.visa },
        ] as { method: "cash" | "mada" | "visa"; amount: number }[]
      ).filter((p) => p.amount > 0);

      const sale = await createSale({
        shift: shift.id,
        customer: customer?.id,
        items: cart.map((i) => ({
          product: i.product.id,
          qty: i.qty,
          unit_price: i.unitPrice,
          discount_pct: i.discountPct,
          discount_amt: i.discountAmt,
          total: i.total,
        })),
        discount_pct: invoiceDiscount.pct,
        discount_amt: invoiceDiscAmt,
        subtotal,
        total: grandTotal,
        payments,
      });
      setLastSale(sale);
      setCart([]);
      setCustomer(null);
      setInvoiceDiscount({ pct: 0, amt: 0 });
      printReceipt(sale);
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل إتمام البيع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col md:flex-row overflow-hidden">
      {/* ─── Left: Search + Products ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-l border-gray-200">
        {/* Search bar */}
        <div className="p-3 bg-white border-b border-gray-200 no-print">
          <div className="relative">
            <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="اسم المنتج أو باركود..."
              className="input pr-9 text-lg"
              autoComplete="off"
            />
            {searching && (
              <span className="absolute left-3 top-3 text-gray-400 animate-spin">
                ⏳
              </span>
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-30 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto w-[calc(100%-1.5rem)]">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 text-right border-b border-gray-100 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-gray-800">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.barcode} · مخزون: {p.stock} {p.unit}
                    </div>
                  </div>
                  <div className="text-blue-700 font-bold text-lg">
                    {p.price.toFixed(2)} ر.س
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customer selector */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 no-print">
          <div className="relative">
            <input
              type="text"
              value={customer ? customer.name : customerSearch}
              onChange={handleCustomerSearch}
              onFocus={() => customer && setCustomer(null)}
              placeholder="اختر عميل (اختياري)..."
              className="input text-sm"
            />
            {customer && (
              <button
                onClick={() => { setCustomer(null); setCustomerSearch(""); }}
                className="absolute left-2 top-2 text-gray-400 hover:text-red-500 text-lg leading-none"
              >
                ✕
              </button>
            )}
            {customerResults.length > 0 && !customer && (
              <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-full max-h-48 overflow-y-auto">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomer(c); setCustomerResults([]); setCustomerSearch(""); }}
                    className="w-full text-right px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-gray-500 text-xs mr-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <div className="text-6xl mb-4">🛒</div>
              <div className="text-lg">السلة فارغة</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="text-right py-2 px-3 font-medium">الصنف</th>
                  <th className="py-2 px-2 font-medium text-center w-24">الكمية</th>
                  <th className="py-2 px-2 font-medium text-center w-20">السعر</th>
                  <th className="py-2 px-2 font-medium text-center w-20">خصم</th>
                  <th className="py-2 px-3 font-medium text-left w-24">الإجمالي</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={item.product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs text-gray-400">{item.product.barcode}</div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateQty(idx, -1)}
                          className="w-7 h-7 bg-gray-200 rounded-full text-gray-700 font-bold hover:bg-gray-300 flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(idx, 1)}
                          className="w-7 h-7 bg-blue-100 rounded-full text-blue-700 font-bold hover:bg-blue-200 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => setDiscountModal({ target: idx })}
                        className={`text-xs px-2 py-1 rounded-lg ${
                          item.discountPct > 0 || item.discountAmt > 0
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600"
                        }`}
                      >
                        {item.discountPct > 0
                          ? `${item.discountPct}%`
                          : item.discountAmt > 0
                          ? `${item.discountAmt.toFixed(2)}`
                          : "خصم"}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-left font-bold text-blue-700">
                      {item.total.toFixed(2)}
                    </td>
                    <td className="py-2 px-1">
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-red-400 hover:text-red-600 text-lg"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Right: Order Summary + Actions ─────────────────────── */}
      <div className="w-full md:w-72 bg-white border-t md:border-t-0 border-gray-200 flex flex-col no-print">
        {/* Summary */}
        <div className="p-4 flex-1">
          <h2 className="font-bold text-gray-700 mb-3">ملخص الفاتورة</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">عدد الأصناف</span>
              <span className="font-semibold">{cart.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span className="font-semibold">{subtotal.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">خصم الفاتورة</span>
              <button
                onClick={() => setDiscountModal({ target: "invoice" })}
                className={`text-sm px-3 py-1 rounded-lg ${
                  invoiceDiscAmt > 0
                    ? "bg-orange-100 text-orange-700 font-bold"
                    : "bg-gray-100 text-gray-500 hover:bg-orange-50"
                }`}
              >
                {invoiceDiscount.pct > 0
                  ? `${invoiceDiscount.pct}%`
                  : invoiceDiscAmt > 0
                  ? `${invoiceDiscAmt.toFixed(2)}`
                  : "إضافة خصم"}
              </button>
            </div>
            {invoiceDiscAmt > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>قيمة الخصم</span>
                <span>-{invoiceDiscAmt.toFixed(2)} ر.س</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t-2 border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-800">الإجمالي</span>
              <span className="text-2xl font-extrabold text-blue-700">
                {grandTotal.toFixed(2)}
                <span className="text-base font-semibold text-gray-500 mr-1">ر.س</span>
              </span>
            </div>
          </div>

          {/* Last sale success */}
          {lastSale && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
              <div className="text-green-700 font-semibold">
                ✓ تم البيع #{lastSale.invoice_number}
              </div>
              <button
                onClick={() => printReceipt(lastSale)}
                className="text-green-600 underline text-xs mt-1"
              >
                إعادة طباعة الفاتورة
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 space-y-2 border-t border-gray-200">
          <button
            onClick={() => setPaymentModal(true)}
            disabled={cart.length === 0 || loading}
            className="btn-success w-full text-lg py-3"
          >
            {loading ? "جارٍ المعالجة..." : `دفع ${grandTotal.toFixed(2)} ر.س`}
          </button>
          <button
            onClick={() => {
              setCart([]);
              setCustomer(null);
              setInvoiceDiscount({ pct: 0, amt: 0 });
              setLastSale(null);
            }}
            disabled={cart.length === 0}
            className="btn-secondary w-full"
          >
            مسح السلة
          </button>
        </div>
      </div>

      {/* ─── Discount modal ─────────────────────────────────────── */}
      {discountModal && (
        <DiscountModal
          label={
            discountModal.target === "invoice"
              ? "خصم على الفاتورة"
              : `خصم على: ${cart[discountModal.target as number]?.product.name}`
          }
          current={
            discountModal.target === "invoice"
              ? invoiceDiscount.pct
              : cart[discountModal.target as number]?.discountPct ?? 0
          }
          onApply={(pct, amt) => {
            if (discountModal.target === "invoice") {
              setInvoiceDiscount({ pct, amt });
              setDiscountModal(null);
            } else {
              applyItemDiscount(discountModal.target as number, pct, amt);
            }
          }}
          onClose={() => setDiscountModal(null)}
        />
      )}

      {/* ─── Payment modal ──────────────────────────────────────── */}
      {paymentModal && (
        <PaymentModal
          total={grandTotal}
          onConfirm={handlePaymentConfirm}
          onClose={() => setPaymentModal(false)}
        />
      )}
    </div>
  );
}
