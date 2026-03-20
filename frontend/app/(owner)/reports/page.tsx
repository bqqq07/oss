"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Header from "@/components/ui/Header";
import {
  fetchSalesReport,
  fetchProductsReport,
  fetchEmployeesReport,
} from "@/lib/api";
import type {
  SalesReport,
  ProductReport,
  EmployeeReport,
  ReportFilters,
  ReportPeriod,
} from "@/types";
import { FileBarChart2, Download, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

// ─── Mock fallback ────────────────────────────────────────────────────────────
const MOCK_SALES: SalesReport = {
  period: "هذا الشهر",
  total_sales: 342000,
  total_cost: 205200,
  gross_profit: 136800,
  gross_margin: 40,
  operating_expenses: 28300,
  net_operating_profit: 108500,
  net_margin: 31.7,
  transactions: 1187,
  returns: 23,
  net_sales: 318770,
  payment_breakdown: [
    { method: "cash", amount: 128000, count: 445, fee: 0, fee_rate: 0 },
    { method: "mada", amount: 142000, count: 523, fee: 2130, fee_rate: 1.5 },
    { method: "apple_pay", amount: 72000, count: 219, fee: 2160, fee_rate: 3 },
  ],
  daily_data: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split("T")[0],
      sales: Math.round(8000 + Math.random() * 12000),
      profit: Math.round(3000 + Math.random() * 5000),
      transactions: Math.round(25 + Math.random() * 40),
    };
  }),
};

const MOCK_PRODUCTS: ProductReport[] = [
  { product_id: "1", product_name: "كريم مرطب فيتامين C", sku: "SK-001", category: "مرطبات", quantity_sold: 142, quantity_returned: 3, net_quantity: 139, revenue: 13490, cost: 5540, profit: 7950, margin: 58.9 },
  { product_id: "2", product_name: "سيروم هيالورونيك", sku: "SK-002", category: "مصول", quantity_sold: 118, quantity_returned: 2, net_quantity: 116, revenue: 11800, cost: 4720, profit: 7080, margin: 60 },
  { product_id: "3", product_name: "واقي شمس SPF50", sku: "SK-004", category: "حماية", quantity_sold: 95, quantity_returned: 0, net_quantity: 95, revenue: 11400, cost: 5130, profit: 6270, margin: 55 },
];

const MOCK_EMPLOYEES: EmployeeReport[] = [
  { employee_id: "e1", employee_name: "نورة الأحمدي", total_sales: 142000, transactions: 498, returns: 9, avg_basket: 285, total_discounts: 4200, shift_count: 22 },
  { employee_id: "e2", employee_name: "ريم العتيبي", total_sales: 118000, transactions: 421, returns: 7, avg_basket: 280, total_discounts: 3100, shift_count: 20 },
  { employee_id: "e3", employee_name: "سارة الزهراني", total_sales: 82000, transactions: 268, returns: 7, avg_basket: 306, total_discounts: 1800, shift_count: 18 },
];

// ─────────────────────────────────────────────────────────────────────────────

type TabKey = "sales" | "products" | "employees";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "اليوم",
  yesterday: "أمس",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  custom: "مخصص",
};

function formatCurrency(v: number) {
  return `${v.toLocaleString("ar-SA")} ر.س`;
}

function formatPct(v: number) {
  return `${v.toFixed(1)}%`;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("sales");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [salesReport, setSalesReport] = useState<SalesReport>(MOCK_SALES);
  const [productsReport, setProductsReport] = useState<ProductReport[]>(MOCK_PRODUCTS);
  const [employeesReport, setEmployeesReport] = useState<EmployeeReport[]>(MOCK_EMPLOYEES);
  const [loading, setLoading] = useState(false);

  const filters: ReportFilters = { period };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "sales") {
        const res = await fetchSalesReport(filters);
        setSalesReport(res);
      } else if (tab === "products") {
        const res = await fetchProductsReport(filters);
        setProductsReport(res);
      } else {
        const res = await fetchEmployeesReport(filters);
        setEmployeesReport(res);
      }
    } catch {
      // keep mock data
    } finally {
      setLoading(false);
    }
  }, [tab, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="التقارير" />

      <div className="flex-1 p-4 md:p-6 space-y-5">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
            >
              {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <button className="flex items-center gap-1.5 btn-secondary">
            <Download size={14} />
            تصدير Excel
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 gap-1">
          {(["sales", "products", "employees"] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "sales" ? "المبيعات" : t === "products" ? "المنتجات" : "الموظفون"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Sales Report ──────────────────────────────────────────────── */}
        {!loading && tab === "sales" && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card">
                <p className="text-xs text-gray-400">إجمالي المبيعات</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(salesReport.total_sales)}</p>
                <p className="text-xs text-gray-400">{salesReport.transactions} فاتورة</p>
              </div>
              <div className="card">
                <p className="text-xs text-gray-400">الربح الإجمالي</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(salesReport.gross_profit)}</p>
                <p className="text-xs text-gray-400">هامش {formatPct(salesReport.gross_margin)}</p>
              </div>
              <div className="card">
                <p className="text-xs text-gray-400">صافي الربح التشغيلي</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(salesReport.net_operating_profit)}</p>
                <p className="text-xs text-gray-400">هامش {formatPct(salesReport.net_margin)}</p>
              </div>
              <div className="card">
                <p className="text-xs text-gray-400">المرتجعات</p>
                <p className="text-xl font-bold text-red-600">{salesReport.returns}</p>
                <p className="text-xs text-gray-400">صافي: {formatCurrency(salesReport.net_sales)}</p>
              </div>
            </div>

            {/* Sales chart */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">اتجاه المبيعات اليومي</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesReport.daily_data}>
                  <defs>
                    <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(d) => {
                      try { return format(parseISO(d), "d/M"); } catch { return d; }
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "المبيعات"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#9333ea" strokeWidth={2} fill="url(#repGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Payment methods breakdown */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">تفصيل وسائل الدفع والرسوم</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-right">
                      <th className="pb-2 text-gray-400 font-medium">وسيلة الدفع</th>
                      <th className="pb-2 text-gray-400 font-medium text-center">العدد</th>
                      <th className="pb-2 text-gray-400 font-medium text-left">المبلغ</th>
                      <th className="pb-2 text-gray-400 font-medium text-left">الرسوم</th>
                      <th className="pb-2 text-gray-400 font-medium text-left">الصافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salesReport.payment_breakdown.map((pm) => (
                      <tr key={pm.method} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-700">
                          {{ cash: "نقدي", mada: "مدى", card: "بطاقة", apple_pay: "Apple Pay" }[pm.method] ?? pm.method}
                        </td>
                        <td className="py-2.5 text-center text-gray-500">{pm.count}</td>
                        <td className="py-2.5 text-left text-gray-700">{formatCurrency(pm.amount)}</td>
                        <td className="py-2.5 text-left text-red-500">{pm.fee > 0 ? formatCurrency(pm.fee) : "—"}</td>
                        <td className="py-2.5 text-left text-green-700 font-medium">{formatCurrency(pm.amount - pm.fee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Products Report ───────────────────────────────────────────── */}
        {!loading && tab === "products" && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right">
                  <th className="pb-3 text-gray-400 font-medium">المنتج</th>
                  <th className="pb-3 text-gray-400 font-medium text-center">المبيعات</th>
                  <th className="pb-3 text-gray-400 font-medium text-center">المرتجع</th>
                  <th className="pb-3 text-gray-400 font-medium text-left">الإيراد</th>
                  <th className="pb-3 text-gray-400 font-medium text-left">الربح</th>
                  <th className="pb-3 text-gray-400 font-medium text-left">الهامش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productsReport.map((p) => (
                  <tr key={p.product_id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <p className="font-medium text-gray-800">{p.product_name}</p>
                      <p className="text-xs text-gray-400">{p.sku} — {p.category}</p>
                    </td>
                    <td className="py-3 text-center">{p.quantity_sold}</td>
                    <td className="py-3 text-center text-red-500">{p.quantity_returned}</td>
                    <td className="py-3 text-left text-gray-700">{formatCurrency(p.revenue)}</td>
                    <td className="py-3 text-left text-green-700 font-medium">{formatCurrency(p.profit)}</td>
                    <td className="py-3 text-left">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.margin >= 50 ? "bg-green-100 text-green-700" :
                        p.margin >= 30 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {formatPct(p.margin)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Employees Report ──────────────────────────────────────────── */}
        {!loading && tab === "employees" && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right">
                  <th className="pb-3 text-gray-400 font-medium">الموظف</th>
                  <th className="pb-3 text-gray-400 font-medium text-left">المبيعات</th>
                  <th className="pb-3 text-gray-400 font-medium text-center">الفواتير</th>
                  <th className="pb-3 text-gray-400 font-medium text-center">المرتجعات</th>
                  <th className="pb-3 text-gray-400 font-medium text-left">متوسط الفاتورة</th>
                  <th className="pb-3 text-gray-400 font-medium text-left">الخصومات</th>
                  <th className="pb-3 text-gray-400 font-medium text-center">الشفتات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employeesReport.map((e) => (
                  <tr key={e.employee_id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{e.employee_name}</td>
                    <td className="py-3 text-left text-gray-700 font-medium">{formatCurrency(e.total_sales)}</td>
                    <td className="py-3 text-center">{e.transactions}</td>
                    <td className="py-3 text-center text-red-500">{e.returns}</td>
                    <td className="py-3 text-left text-gray-600">{formatCurrency(e.avg_basket)}</td>
                    <td className="py-3 text-left text-orange-500">{formatCurrency(e.total_discounts)}</td>
                    <td className="py-3 text-center">{e.shift_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
