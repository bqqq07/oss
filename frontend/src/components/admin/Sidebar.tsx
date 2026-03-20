'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearTokens } from '@/lib/api';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin/products',  label: 'المنتجات',    icon: '📦', permission: 'products.view' },
  { href: '/admin/purchases', label: 'المشتريات',   icon: '🛒', permission: 'purchases.view' },
  { href: '/admin/suppliers', label: 'الموردون',    icon: '🏭', permission: 'suppliers.view' },
  { href: '/admin/employees', label: 'الموظفون',    icon: '👥', permission: 'employees.view' },
  { href: '/admin/expenses',  label: 'المصاريف',    icon: '💰', permission: 'expenses.view' },
  { href: '/admin/inventory', label: 'المخزون',     icon: '🏪', permission: 'inventory.view' },
];

interface SidebarProps {
  userPermissions: string[];
  userName: string;
}

export default function Sidebar({ userPermissions, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.push('/login');
  }

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col" dir="rtl">
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-xl font-bold text-indigo-400">لوحة الإدارة</h1>
        <p className="text-xs text-gray-400 mt-1">{userName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.filter((item) => userPermissions.includes(item.permission)).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-700 hover:text-white transition"
        >
          <span>🚪</span>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
