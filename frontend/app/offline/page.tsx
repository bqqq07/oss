import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="text-center text-white max-w-sm">
        <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
          <WifiOff size={36} className="text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">أنت غير متصل</h1>
        <p className="text-slate-400 mb-6 leading-relaxed">
          لا يوجد اتصال بالإنترنت. يمكنك الاستمرار في البيع والطباعة وإغلاق الشفت.
          ستُزامَن البيانات تلقائياً عند عودة الاتصال.
        </p>
        <div className="bg-slate-800 rounded-xl p-4 text-sm text-right space-y-2 mb-6">
          <p className="font-semibold text-slate-300 mb-2">يعمل أوفلاين:</p>
          {["البيع والدفع", "طباعة الفواتير", "المرتجعات البسيطة", "فتح/إغلاق الشفت"].map((item) => (
            <p key={item} className="flex items-center gap-2 text-green-400">
              <span>✓</span> {item}
            </p>
          ))}
          <p className="font-semibold text-slate-300 mt-3 mb-2">لا يعمل أوفلاين:</p>
          {["التقارير", "المشتريات", "الإعدادات"].map((item) => (
            <p key={item} className="flex items-center gap-2 text-red-400">
              <span>✗</span> {item}
            </p>
          ))}
        </div>
        <Link
          href="/cashier/pos"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
        >
          الذهاب لنقطة البيع
        </Link>
      </div>
    </div>
  );
}
