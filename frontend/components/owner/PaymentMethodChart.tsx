"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PaymentMethodStats } from "@/types";

interface PaymentMethodChartProps {
  data: PaymentMethodStats[];
}

const COLORS = ["#9333ea", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  mada: "مدى",
  apple_pay: "Apple Pay",
  bank_transfer: "تحويل بنكي",
  other: "أخرى",
};

function formatCurrency(value: number): string {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export default function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const chartData = data.map((d) => ({
    name: METHOD_LABELS[d.method] ?? d.method,
    value: d.amount,
    fee: d.fee,
    count: d.count,
    fee_rate: d.fee_rate,
    original: d.method,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        توزيع وسائل الدفع
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "المبلغ"]}
              contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Fee breakdown table */}
        <div className="space-y-2">
          {chartData.map((item, idx) => (
            <div
              key={item.original}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: COLORS[idx % COLORS.length] }}
                />
                <span className="text-gray-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <span className="text-gray-700 font-medium">
                  {formatCurrency(item.value)}
                </span>
                {item.fee > 0 && (
                  <span className="text-red-500">
                    رسوم: {formatCurrency(item.fee)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
