"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/api";

const navItems = [
  { href: "/cashier/pos", label: "البيع" },
  { href: "/cashier/return", label: "مرتجع" },
  { href: "/cashier/shift/close", label: "إغلاق شفت" },
];

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Login and shift pages don't need nav bar
  const isLoginPage = pathname === "/cashier/login";
  const isShiftOpenPage = pathname === "/cashier/shift/open";

  if (isLoginPage || isShiftOpenPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-blue-700 text-white px-4 py-2 flex items-center justify-between shadow-md no-print">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">🛒 كاشير POS</span>
        </div>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-white text-blue-700"
                  : "hover:bg-blue-600 text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => logout()}
          className="text-sm px-3 py-1.5 bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors"
        >
          خروج
        </button>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
