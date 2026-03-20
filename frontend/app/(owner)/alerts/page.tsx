"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/ui/Header";
import { fetchAlerts, markAlertRead, markAllAlertsRead } from "@/lib/api";
import { getConflicts, getFailedRecords } from "@/lib/sync";
import type { Alert, SyncRecord } from "@/types";
import {
  AlertTriangle,
  Info,
  Bell,
  CheckCheck,
  RefreshCw,
  XCircle,
  GitMerge,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

// ─── Mock alerts ──────────────────────────────────────────────────────────────
const MOCK_ALERTS: Alert[] = [
  {
    id: "a1",
    type: "low_stock",
    severity: "critical",
    title: "مخزون حرج: كريم مرطب الليل",
    message: "نفد المخزون تماماً (الحد الأدنى: 10 وحدات). يرجى إعادة الطلب.",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: "a2",
    type: "low_stock",
    severity: "warning",
    title: "مخزون منخفض: مصل فيتامين E",
    message: "المتبقي 3 وحدات من أصل 15 (الحد الأدنى).",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: "a3",
    type: "cash_discrepancy",
    severity: "warning",
    title: "فرق صندوق في إغلاق شفت",
    message: "سارة الزهراني — فرق: -45 ر.س في إغلاق شفت الساعة 10:00م.",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: "a4",
    type: "large_return",
    severity: "warning",
    title: "مرتجع بقيمة عالية",
    message: "تم تسجيل مرتجع بقيمة 850 ر.س من قِبل نورة الأحمدي.",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
  },
  {
    id: "a5",
    type: "discount_abuse",
    severity: "info",
    title: "خصومات مرتفعة",
    message: "ريم العتيبي منحت خصومات تتجاوز 15% في 3 فواتير اليوم.",
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    is_read: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: {
    icon: <XCircle size={16} />,
    bg: "bg-red-50 border-red-200",
    icon_bg: "bg-red-100 text-red-600",
    badge: "badge-critical",
    label: "حرج",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: "bg-yellow-50 border-yellow-200",
    icon_bg: "bg-yellow-100 text-yellow-600",
    badge: "badge-warning",
    label: "تحذير",
  },
  info: {
    icon: <Info size={16} />,
    bg: "bg-blue-50 border-blue-200",
    icon_bg: "bg-blue-100 text-blue-600",
    badge: "badge-info",
    label: "معلومة",
  },
};

const TYPE_LABELS: Record<Alert["type"], string> = {
  low_stock: "مخزون",
  sync_conflict: "تعارض مزامنة",
  large_return: "مرتجع كبير",
  discount_abuse: "خصم مرتفع",
  offline_pending: "معلق أوفلاين",
  cash_discrepancy: "فرق صندوق",
};

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { locale: ar, addSuffix: true });
  } catch {
    return iso;
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [conflicts, setConflicts] = useState<SyncRecord[]>([]);
  const [failed, setFailed] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apiAlerts, syncConflicts, syncFailed] = await Promise.allSettled([
        fetchAlerts(),
        getConflicts(),
        getFailedRecords(),
      ]);

      if (apiAlerts.status === "fulfilled") setAlerts(apiAlerts.value);
      if (syncConflicts.status === "fulfilled") setConflicts(syncConflicts.value);
      if (syncFailed.status === "fulfilled") setFailed(syncFailed.value);
    } catch {
      // keep mock
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
    try {
      await markAlertRead(id);
    } catch {
      // optimistic UI — revert not implemented for brevity
    }
  };

  const handleMarkAllRead = async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    try {
      await markAllAlertsRead();
    } catch {
      //
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === "unread") return !a.is_read;
    if (filter === "critical") return a.severity === "critical";
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="التنبيهات" />

      <div className="flex-1 p-4 md:p-6 space-y-5">
        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["all", "unread", "critical"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filter === f
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "الكل" : f === "unread" ? `غير مقروء (${unreadCount})` : "حرجة"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              تحديث
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700"
              >
                <CheckCheck size={14} />
                تحديد الكل كمقروء
              </button>
            )}
          </div>
        </div>

        {/* ── Sync conflicts section ────────────────────────────────────── */}
        {(conflicts.length > 0 || failed.length > 0) && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GitMerge size={13} />
              تعارضات المزامنة
            </h2>
            <div className="space-y-2">
              {conflicts.map((record) => (
                <div
                  key={record.uuid}
                  className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <span className="bg-orange-100 text-orange-600 rounded-lg p-1.5 flex-shrink-0">
                    <GitMerge size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800">
                        تعارض: {record.type === "invoice" ? "فاتورة" : record.type === "return" ? "مرتجع" : "حركة صندوق"}
                      </span>
                      <span className="badge-warning">Server wins</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      UUID: <span className="font-mono">{record.uuid}</span>
                    </p>
                    {record.error && (
                      <p className="text-xs text-orange-700 mt-1">{record.error}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(record.created_at)}
                    </p>
                  </div>
                </div>
              ))}

              {failed.map((record) => (
                <div
                  key={record.uuid}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <span className="bg-red-100 text-red-600 rounded-lg p-1.5 flex-shrink-0">
                    <XCircle size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800">
                        فشل المزامنة: {record.type === "invoice" ? "فاتورة" : record.type === "return" ? "مرتجع" : "حركة صندوق"}
                      </span>
                      <span className="badge-critical">محاولات: {record.retry_count}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{record.uuid}</p>
                    {record.error && (
                      <p className="text-xs text-red-600 mt-1">{record.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Server alerts ─────────────────────────────────────────────── */}
        <section>
          {alerts.length > 0 && (
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell size={13} />
              تنبيهات النظام
            </h2>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد تنبيهات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((alert) => {
                const cfg = SEVERITY_CONFIG[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 flex items-start gap-3 transition-opacity ${cfg.bg} ${
                      alert.is_read ? "opacity-60" : ""
                    }`}
                  >
                    <span className={`rounded-lg p-1.5 flex-shrink-0 ${cfg.icon_bg}`}>
                      {cfg.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800">
                          {alert.title}
                        </span>
                        <span className={cfg.badge}>{cfg.label}</span>
                        <span className="text-xs text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">
                          {TYPE_LABELS[alert.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {timeAgo(alert.created_at)}
                      </p>
                    </div>
                    {!alert.is_read && (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 bg-white/70 px-2 py-1 rounded-lg"
                      >
                        تحديد كمقروء
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
