import type { EmployeePerformance } from "@/types";
import { Users } from "lucide-react";

interface EmployeePerformanceProps {
  employees: EmployeePerformance[];
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export default function EmployeePerformanceCard({
  employees,
}: EmployeePerformanceProps) {
  const maxSales = Math.max(...employees.map((e) => e.total_sales), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-700">أداء الموظفين</h3>
      </div>

      <div className="space-y-4">
        {employees.map((emp, idx) => (
          <div key={emp.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{emp.name}</p>
                  <p className="text-xs text-gray-400">{emp.role}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">
                  {formatCurrency(emp.total_sales)}
                </p>
                <p className="text-xs text-gray-400">
                  {emp.transactions_count} فاتورة
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                style={{ width: `${(emp.total_sales / maxSales) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>متوسط الفاتورة: {formatCurrency(emp.average_transaction)}</span>
              <span>{emp.shift_hours} ساعة عمل</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
