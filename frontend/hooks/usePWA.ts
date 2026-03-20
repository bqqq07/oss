"use client";

import { useEffect } from "react";
import { processSyncQueue } from "@/lib/sync";

/**
 * Registers the service worker and sets up the sync listener.
 * Call this once in the root layout or a top-level component.
 */
export function usePWA() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] SW registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] SW registration failed:", err);
        });

      // Listen for sync requests from SW
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_REQUESTED") {
          processSyncQueue();
        }
      });
    }

    // Trigger sync when coming back online
    const handleOnline = () => {
      console.log("[PWA] Online — triggering sync");
      processSyncQueue();

      // Register background sync if supported
      navigator.serviceWorker?.ready.then((reg) => {
        if ("sync" in reg) {
          (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
            .sync.register("pos-sync")
            .catch(() => {
              // Background sync not supported — foreground sync already triggered
            });
        }
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
