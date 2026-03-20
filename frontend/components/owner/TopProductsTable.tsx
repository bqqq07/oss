import type { TopProduct } from "@/types";

interface TopProductsTableProps {
  products: TopProduct[];
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        أعلى 10 منتجات مبيعاً
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right border-b border-gray-100">
              <th className="pb-2 text-gray-400 font-medium">#</th>
              <th className="pb-2 text-gray-400 font-medium">المنتج</th>
              <th className="pb-2 text-gray-400 font-medium text-center">الكمية</th>
              <th className="pb-2 text-gray-400 font-medium text-left">الإيراد</th>
              <th className="pb-2 text-gray-400 font-medium text-left">الربح</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((product, index) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-1 text-gray-400 font-mono text-xs">
                  {index + 1}
                </td>
                <td className="py-2.5">
                  <div>
                    <p className="font-medium text-gray-800 truncate max-w-[140px]">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400">{product.sku}</p>
                  </div>
                </td>
                <td className="py-2.5 text-center">
                  <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {product.quantity_sold}
                  </span>
                </td>
                <td className="py-2.5 text-left text-gray-700 font-medium">
                  {formatCurrency(product.revenue)}
                </td>
                <td className="py-2.5 text-left text-green-600 font-medium">
                  {formatCurrency(product.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
