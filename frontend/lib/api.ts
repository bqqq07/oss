import { getAccessToken, getRefreshToken, saveTokens, clearAuth } from "./auth";
import type {
  DashboardData,
  ReportFilters,
  SalesReport,
  ProductReport,
  EmployeeReport,
  Alert,
  OfflineProduct,
  AuthTokens,
  SyncRecord,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ─── Core fetch with JWT ────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, options, false);
    clearAuth();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as AuthTokens;
    saveTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export async function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>("/dashboard/");
}

// ─── Reports ────────────────────────────────────────────────────────────────
export async function fetchSalesReport(filters: ReportFilters): Promise<SalesReport> {
  const params = new URLSearchParams(filters as Record<string, string>);
  return apiFetch<SalesReport>(`/reports/sales/?${params}`);
}

export async function fetchProductsReport(filters: ReportFilters): Promise<ProductReport[]> {
  const params = new URLSearchParams(filters as Record<string, string>);
  return apiFetch<ProductReport[]>(`/reports/products/?${params}`);
}

export async function fetchEmployeesReport(filters: ReportFilters): Promise<EmployeeReport[]> {
  const params = new URLSearchParams(filters as Record<string, string>);
  return apiFetch<EmployeeReport[]>(`/reports/employees/?${params}`);
}

// ─── Alerts ─────────────────────────────────────────────────────────────────
export async function fetchAlerts(unreadOnly = false): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/alerts/?unread=${unreadOnly}`);
}

export async function markAlertRead(alertId: string): Promise<void> {
  await apiFetch(`/alerts/${alertId}/read/`, { method: "PATCH" });
}

export async function markAllAlertsRead(): Promise<void> {
  await apiFetch("/alerts/read-all/", { method: "POST" });
}

// ─── Offline product cache ───────────────────────────────────────────────────
export async function fetchProductsForCache(): Promise<OfflineProduct[]> {
  return apiFetch<OfflineProduct[]>("/products/cache/");
}

// ─── Sync endpoints ──────────────────────────────────────────────────────────
export async function syncInvoice(payload: unknown): Promise<{ uuid: string; status: string }> {
  return apiFetch("/invoices/sync/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function syncReturn(payload: unknown): Promise<{ uuid: string; status: string }> {
  return apiFetch("/returns/sync/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function syncCashMovement(payload: unknown): Promise<{ uuid: string; status: string }> {
  return apiFetch("/cash-movements/sync/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function pushSyncRecord(record: SyncRecord): Promise<{ uuid: string; status: string }> {
  switch (record.type) {
    case "invoice":
      return syncInvoice(record.payload);
    case "return":
      return syncReturn(record.payload);
    case "cash_movement":
      return syncCashMovement(record.payload);
  }
}
