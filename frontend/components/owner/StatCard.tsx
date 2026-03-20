import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number; // percentage change
  prefix?: string;
  suffix?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "border-gray-100",
  success: "border-green-100 bg-green-50/30",
  warning: "border-yellow-100 bg-yellow-50/30",
  danger: "border-red-100 bg-red-50/30",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-purple-600",
  trend,
  prefix,
  suffix,
  variant = "default",
}: StatCardProps) {
  const trendPositive = trend != null && trend >= 0;

  return (
    <div
      className={clsx(
        "bg-white rounded-xl border p-5 shadow-sm flex flex-col gap-3",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        {Icon && (
          <span className={clsx("p-2 rounded-lg bg-gray-50", iconColor)}>
            <Icon size={18} />
          </span>
        )}
      </div>

      <div className="flex items-end gap-1">
        {prefix && <span className="text-sm text-gray-400 mb-0.5">{prefix}</span>}
        <span className="text-2xl font-bold text-gray-900 leading-none">
          {typeof value === "number" ? value.toLocaleString("ar-SA") : value}
        </span>
        {suffix && <span className="text-sm text-gray-400 mb-0.5">{suffix}</span>}
      </div>

      <div className="flex items-center justify-between text-xs">
        {subtitle && <span className="text-gray-400">{subtitle}</span>}
        {trend != null && (
          <span
            className={clsx(
              "font-semibold",
              trendPositive ? "text-green-600" : "text-red-500"
            )}
          >
            {trendPositive ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
