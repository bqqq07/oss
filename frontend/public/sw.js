/**
 * POS Service Worker — ROLE-12
 *
 * Strategy:
 *  - App shell (HTML/JS/CSS) → Cache First (stale-while-revalidate)
 *  - API GET requests        → Network First, fallback to cache
 *  - API POST/PATCH/DELETE   → Network only (offline ops handled via IndexedDB + sync queue)
 *  - Static assets           → Cache First
 */

const CACHE_NAME = "pos-v1";
const OFFLINE_URL = "/offline";

// Files that form the app shell — cached on install
const APP_SHELL = [
  "/",
  "/offline",
  "/cashier/pos",
  "/owner/dashboard",
  "/manifest.json",
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for mutation requests — those are handled by sync queue
  if (request.method !== "GET") return;

  // Skip chrome-extension and non-http
  if (!url.protocol.startsWith("http")) return;

  // API requests → Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Navigation requests → stale-while-revalidate, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // Static assets → Cache First
  event.respondWith(cacheFirstWithNetwork(request));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

// ─── Background Sync ─────────────────────────────────────────────────────────
// The app registers a background sync tag "pos-sync" when it queues operations.
// When connectivity is restored the browser fires this event.
self.addEventListener("sync", (event) => {
  if (event.tag === "pos-sync") {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage({ type: "SYNC_REQUESTED" }));
}

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "POS Alert", {
      body: data.message,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: data.tag ?? "pos-notification",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(self.clients.openWindow(event.notification.data.url));
  }
});
