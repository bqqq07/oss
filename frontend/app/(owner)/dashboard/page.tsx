"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import Header from "@/components/ui/Header";
import StatCard from "@/components/owner/StatCard";
import SalesChart from "@/components/owner/SalesChart";
import PaymentMethodChart from "@/components/owner/PaymentMethodChart";
import TopProductsTable from "@/components/owner/TopProductsTable";
import CriticalProducts from "@/components/owner/CriticalProducts";
import EmployeePerformanceCard from "@/components/owner/EmployeePerformance";
import ComparisonChart from "@/components/owner/ComparisonChart";
import { fetchDashboard } from "@/lib/api";
import type { DashboardData } from "@/types";

// ─── Mock data — remove when API is ready ────────────────────────────────────
const MOCK_DATA: DashboardData = {
  summary: {
    today: {
      total_sales: 14520,
      total_transactions: 47,
      gross_profit: 5808,
      net_operating_profit: 4350,
      period: "day",
    },
    week: {
      total_sales: 89400,
      total_transactions: 312,
      gross_profit: 35760,
      net_operating_profit: 28920,
      period: "week",
    },
    month: {
      total_sales: 342000,
      total_transactions: 1187,
      gross_profit: 136800,
      net_operating_profit: 108500,
      period: "month",
    },
  },
  payment_methods: [
    { method: "cash", amount: 5420, count: 18, fee: 0, fee_rate: 0 },
    { method: "mada", amount: 6180, count: 21, fee: 92.7, fee_rate: 1.5 },
    { method: "apple_pay", amount: 2920, count: 8, fee: 87.6, fee_rate: 3 },
  ],
  top_products: [
    { id: "1", name: "كريم مرطب فيتامين C", sku: "SK-001", quantity_sold: 38, revenue: 3610, profit: 1444 },
    { id: "2", name: "سيروم هيالورونيك", sku: "SK-002", quantity_sold: 31, revenue: 3100, profit: 1240 },
    { id: "3", name: "غسول وجه للبشرة الدهنية", sku: "SK-003", quantity_sold: 27, revenue: 1890, profit: 756 },
    { id: "4", name: "واقي شمس SPF50", sku: "SK-004", quantity_sold: 24, revenue: 2880, profit: 1152 },
    { id: "5", name: "تونر بحمض الساليسيليك", sku: "SK-005", quantity_sold: 22, revenue: 1760, profit: 704 },
    { id: "6", name: "ماسك الطين البركاني", sku: "SK-006", quantity_sold: 19, revenue: 1330, profit: 532 },
    { id: "7", name: "زيت الأرغان للشعر", sku: "SK-007", quantity_sold: 17, revenue: 2210, profit: 884 },
    { id: "8", name: "مقشر الشفاه", sku: "SK-008", quantity_sold: 15, revenue: 450, profit: 180 },
    { id: "9", name: "كريم العيون المضاد للتجاعيد", sku: "SK-009", quantity_sold: 14, revenue: 1960, profit: 784 },
    { id: "10", name: "جل غسيل اليدين", sku: "SK-010", quantity_sold: 13, revenue: 390, profit: 156 },
  ],
  critical_products: [
    { id: "a", name: "كريم مرطب الليل", sku: "SK-021", current_stock: 0, min_stock: 10, category: "مرطبات" },
    { id: "b", name: "مصل فيتامين E", sku: "SK-034", current_stock: 3, min_stock: 15, category: "مصول" },
    { id: "c", name: "كريم الأساس SPF30", sku: "SK-056", current_stock: 2, min_stock: 12, category: "مكياج" },
    { id: "d", name: "شامبو بالكيراتين", sku: "SK-078", current_stock: 5, min_stock: 20, category: "شعر" },
  ],
  employee_performance: [
    { id: "e1", name: "نورة الأحمدي", role: "كاشيرة", total_sales: 6240, transactions_count: 21, average_transaction: 297, shift_hours: 8 },
    { id: "e2", name: "ريم العتيبي", role: "كاشيرة", total_sales: 5180, transactions_count: 18, average_transaction: 288, shift_hours: 8 },
    { id: "e3", name: "سارة الزهراني", role: "كاشيرة", total_sales: 3100, transactions_count: 8, average_transaction: 388, shift_hours: 4 },
  ],
  daily_comparison: Array.from({ length: 30 }, (_, i) => {
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

// ─────────────────────────────────────────────────────────────────────────────

export default function OwnerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboard();
      setData(result);
    } catch {
      // Fallback to mock data in development
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const d = data ?? MOCK_DATA;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="لوحة تحكم المالك" />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Refresh bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            آخر تحديث:{" "}
            {lastRefreshed.toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            تحديث
          </button>
        </div>

        {/* ── Period tabs ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            ملخص المبيعات
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="مبيعات اليوم"
              value={d.summary.today.total_sales}
              suffix="ر.س"
              subtitle={`${d.summary.today.total_transactions} فاتورة`}
              icon={ShoppingBag}
              iconColor="text-purple-600"
              trend={8.2}
            />
            <StatCard
              title="مبيعات الأسبوع"
              value={d.summary.week.total_sales}
              suffix="ر.س"
              subtitle={`${d.summary.week.total_transactions} فاتورة`}
              icon={TrendingUp}
              iconColor="text-blue-600"
              trend={3.5}
            />
            <StatCard
              title="الربح الإجمالي (اليوم)"
              value={d.summary.today.gross_profit}
              suffix="ر.س"
              subtitle={`${Math.round((d.summary.today.gross_profit / d.summary.today.total_sales) * 100)}% هامش`}
              icon={DollarSign}
              iconColor="text-green-600"
              variant="success"
              trend={5.1}
            />
            <StatCard
              title="صافي الربح التشغيلي"
              value={d.summary.today.net_operating_profit}
              suffix="ر.س"
              subtitle={`${Math.round((d.summary.today.net_operating_profit / d.summary.today.total_sales) * 100)}% هامش صافي`}
              icon={BarChart3}
              iconColor="text-emerald-600"
              variant="success"
              trend={4.8}
            />
          </div>
        </section>

        {/* Monthly stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="مبيعات الشهر"
            value={d.summary.month.total_sales}
            suffix="ر.س"
            subtitle={`${d.summary.month.total_transactions} فاتورة`}
            trend={12.3}
          />
          <StatCard
            title="الربح الإجمالي (الشهر)"
            value={d.summary.month.gross_profit}
            suffix="ر.س"
            variant="success"
            trend={9.7}
          />
          <StatCard
            title="صافي الربح (الشهر)"
            value={d.summary.month.net_operating_profit}
            suffix="ر.س"
            variant="success"
            trend={7.2}
          />
        </section>

        {/* ── Charts row ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SalesChart data={d.daily_comparison} title="مبيعات وأرباح آخر 30 يوم" />
          </div>
          <PaymentMethodChart data={d.payment_methods} />
        </section>

        {/* ── Comparison chart ────────────────────────────────────────────── */}
        <section>
          <ComparisonChart data={d.daily_comparison} />
        </section>

        {/* ── Tables row ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TopProductsTable products={d.top_products} />
          <div className="space-y-6">
            <CriticalProducts products={d.critical_products} />
          </div>
        </section>

        {/* ── Employee performance ────────────────────────────────────────── */}
        <section>
          <EmployeePerformanceCard employees={d.employee_performance} />
        </section>
      </div>
    </div>
  );
}
