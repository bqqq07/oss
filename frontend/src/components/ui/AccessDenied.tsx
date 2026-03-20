'use client';

import Link from 'next/link';

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-6xl">🔒</div>
      <h2 className="text-2xl font-bold text-gray-800">غير مصرح لك بالوصول</h2>
      <p className="text-gray-500">ليس لديك الصلاحية اللازمة لعرض هذه الصفحة.</p>
      <Link
        href="/admin"
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
