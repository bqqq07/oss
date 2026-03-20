"use client";

import { Bell, RefreshCw, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { processSyncQueue } from "@/lib/sync";
import { useState } from "react";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { isOnline, pendingCount, conflicts } = useSyncStatus();
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      await processSyncQueue();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Online status */}
        <span
          className={`flex items-center gap-1.5 text-sm font-medium ${
            isOnline ? "text-green-600" : "text-yellow-600"
          }`}
        >
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span className="hidden sm:inline">
            {isOnline ? "متصل" : "غير متصل"}
          </span>
        </span>

        {/* Manual sync button */}
        {pendingCount > 0 && isOnline && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span>مزامنة ({pendingCount})</span>
          </button>
        )}

        {/* Alerts */}
        <Link
          href="/owner/alerts"
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <Bell size={20} />
          {conflicts > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Link>
      </div>
    </header>
  );
}
