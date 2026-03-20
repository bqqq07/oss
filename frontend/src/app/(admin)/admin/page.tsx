import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { User } from '@/types';
import Link from 'next/link';

const CARDS = [
  { href: '/admin/products',  label: 'المنتجات',    icon: '📦', permission: 'products.view',  color: 'bg-blue-100 text-blue-700' },
  { href: '/admin/purchases', label: 'المشتريات',   icon: '🛒', permission: 'purchases.view', color: 'bg-green-100 text-green-700' },
  { href: '/admin/suppliers', label: 'الموردون',    icon: '🏭', permission: 'suppliers.view', color: 'bg-yellow-100 text-yellow-700' },
  { href: '/admin/employees', label: 'الموظفون',    icon: '👥', permission: 'employees.view', color: 'bg-purple-100 text-purple-700' },
  { href: '/admin/expenses',  label: 'المصاريف',    icon: '💰', permission: 'expenses.view',  color: 'bg-red-100 text-red-700' },
  { href: '/admin/inventory', label: 'المخزون',     icon: '🏪', permission: 'inventory.view', color: 'bg-indigo-100 text-indigo-700' },
];

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user')?.value;
  if (!userCookie) redirect('/login');

  const user: User = JSON.parse(userCookie);

  const visible = CARDS.filter((c) => user.permissions.includes(c.permission));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">لوحة التحكم</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {visible.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-sm hover:shadow-md transition ${card.color}`}
          >
            <span className="text-4xl mb-2">{card.icon}</span>
            <span className="text-lg font-semibold">{card.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
