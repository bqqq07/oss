import type { CriticalProduct } from "@/types";
import { AlertTriangle } from "lucide-react";

interface CriticalProductsProps {
  products: CriticalProduct[];
}

export default function CriticalProducts({ products }: CriticalProductsProps) {
  return (
    <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-red-500" />
        <h3 className="text-sm font-semibold text-gray-700">
          منتجات تحت الحد الأدنى
        </h3>
        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full mr-auto">
          {products.length}
        </span>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {products.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            لا توجد منتجات حرجة
          </p>
        ) : (
          products.map((product) => {
            const pct = Math.round(
              (product.current_stock / product.min_stock) * 100
            );
            const isCritical = product.current_stock === 0;

            return (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-red-50/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {product.category} — {product.sku}
                  </p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p
                    className={`text-sm font-bold ${
                      isCritical ? "text-red-600" : "text-orange-500"
                    }`}
                  >
                    {isCritical ? "نفد المخزون" : `${product.current_stock} قطعة`}
                  </p>
                  <p className="text-xs text-gray-400">
                    الحد: {product.min_stock}
                  </p>
                </div>
                {/* Stock bar */}
                <div className="w-16 flex-shrink-0">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCritical
                          ? "bg-red-500"
                          : pct < 50
                          ? "bg-orange-400"
                          : "bg-yellow-400"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
