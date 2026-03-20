"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DailyComparison } from "@/types";
import { useState } from "react";
import { format, parseISO, startOfWeek, getWeek } from "date-fns";
import { ar } from "date-fns/locale";

interface ComparisonChartProps {
  data: DailyComparison[];
}

type ViewMode = "daily" | "weekly" | "monthly";

function groupByWeek(data: DailyComparison[]) {
  const map = new Map<string, { sales: number; profit: number; transactions: number }>();
  data.forEach((d) => {
    try {
      const weekStart = format(
        startOfWeek(parseISO(d.date), { weekStartsOn: 6 }),
        "dd/MM"
      );
      const existing = map.get(weekStart) ?? { sales: 0, profit: 0, transactions: 0 };
      map.set(weekStart, {
        sales: existing.sales + d.sales,
        profit: existing.profit + d.profit,
        transactions: existing.transactions + d.transactions,
      });
    } catch {
      /* skip malformed dates */
    }
  });
  return Array.from(map.entries()).map(([date, vals]) => ({ date, ...vals }));
}

function groupByMonth(data: DailyComparison[]) {
  const map = new Map<string, { sales: number; profit: number; transactions: number }>();
  data.forEach((d) => {
    try {
      const month = format(parseISO(d.date), "MMM yy", { locale: ar });
      const existing = map.get(month) ?? { sales: 0, profit: 0, transactions: 0 };
      map.set(month, {
        sales: existing.sales + d.sales,
        profit: existing.profit + d.profit,
        transactions: existing.transactions + d.transactions,
      });
    } catch {
      /* skip */
    }
  });
  return Array.from(map.entries()).map(([date, vals]) => ({ date, ...vals }));
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export default function ComparisonChart({ data }: ComparisonChartProps) {
  const [view, setView] = useState<ViewMode>("daily");

  const chartData =
    view === "daily"
      ? data.map((d) => {
          try {
            return { ...d, date: format(parseISO(d.date), "d MMM", { locale: ar }) };
          } catch {
            return d;
          }
        })
      : view === "weekly"
      ? groupByWeek(data)
      : groupByMonth(data);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">مقارنة الفترات</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                view === mode
                  ? "bg-white text-gray-800 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode === "daily" ? "يومي" : mode === "weekly" ? "أسبوعي" : "شهري"}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "sales" ? "المبيعات" : "الربح",
            ]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend
            formatter={(value) => (value === "sales" ? "المبيعات" : "الربح")}
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Bar dataKey="sales" fill="#9333ea" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
