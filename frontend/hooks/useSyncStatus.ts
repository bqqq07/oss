"use client";

import { useEffect, useState, useCallback } from "react";
import { getSyncStats, subscribeSyncUpdates } from "@/lib/sync";
import { getPendingCount } from "@/lib/db";

interface SyncStatus {
  pendingCount: number;
  conflicts: number;
  failed: number;
  isOnline: boolean;
  lastSynced?: string;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    pendingCount: 0,
    conflicts: 0,
    failed: 0,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  });

  const refresh = useCallback(async () => {
    try {
      const stats = await getSyncStats();
      setStatus((prev) => ({
        ...prev,
        pendingCount: stats.pending,
        conflicts: stats.conflicts,
        failed: stats.failed,
        lastSynced: stats.lastSynced,
      }));
    } catch {
      // IndexedDB not available (SSR)
    }
  }, []);

  useEffect(() => {
    refresh();

    const unsubscribe = subscribeSyncUpdates(refresh);

    const handleOnline = () =>
      setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh]);

  return status;
}
