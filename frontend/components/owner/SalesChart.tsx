"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DailyComparison } from "@/types";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

interface SalesChartProps {
  data: DailyComparison[];
  title?: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM", { locale: ar });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export default function SalesChart({ data, title = "مقارنة المبيعات" }: SalesChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="dateLabel"
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
            labelFormatter={(label) => `التاريخ: ${label}`}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          />
          <Legend
            formatter={(value) => (value === "sales" ? "المبيعات" : "الربح")}
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="#9333ea"
            strokeWidth={2}
            fill="url(#salesGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#profitGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
