"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileBarChart2,
  Bell,
  LogOut,
  ShoppingCart,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import clsx from "clsx";
import { useSyncStatus } from "@/hooks/useSyncStatus";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  role: "owner" | "cashier" | "manager";
}

const ownerNav: NavItem[] = [
  {
    href: "/owner/dashboard",
    label: "الداشبورد",
    icon: <LayoutDashboard size={18} />,
  },
  {
    href: "/owner/reports",
    label: "التقارير",
    icon: <FileBarChart2 size={18} />,
  },
  {
    href: "/owner/alerts",
    label: "التنبيهات",
    icon: <Bell size={18} />,
  },
];

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { pendingCount, isOnline, conflicts } = useSyncStatus();

  const nav = role === "owner" ? ownerNav : ownerNav;

  return (
    <aside className="fixed inset-y-0 right-0 w-60 bg-slate-900 text-white flex flex-col z-30 shadow-xl">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <ShoppingCart className="text-purple-400 ml-2" size={22} />
        <span className="font-bold text-lg tracking-tight">POS Pro</span>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="mx-3 mt-3 flex items-center gap-2 bg-yellow-500/20 text-yellow-300 rounded-lg px-3 py-2 text-xs">
          <WifiOff size={14} />
          <span>وضع غير متصل</span>
        </div>
      )}

      {/* Pending sync badge */}
      {pendingCount > 0 && (
        <div className="mx-3 mt-2 flex items-center gap-2 bg-blue-500/20 text-blue-300 rounded-lg px-3 py-2 text-xs">
          <RefreshCw size={14} className="animate-spin" />
          <span>{pendingCount} عملية معلقة</span>
        </div>
      )}

      {/* Conflicts badge */}
      {conflicts > 0 && (
        <div className="mx-3 mt-2 flex items-center gap-2 bg-red-500/20 text-red-300 rounded-lg px-3 py-2 text-xs">
          <Bell size={14} />
          <span>{conflicts} تعارض يحتاج مراجعة</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-purple-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
