import type {
  AuthTokens,
  LoginCredentials,
  Product,
  Customer,
  CreateSalePayload,
  Sale,
  CreateReturnPayload,
  SaleReturn,
  Shift,
  OpenShiftPayload,
  CloseShiftPayload,
} from "@/types";

const BASE = "/api/v1";

// ─── Token helpers ─────────────────────────────────────────────────────────
export const tokenStorage = {
  get: (): AuthTokens | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("pos_tokens");
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  },
  set: (tokens: AuthTokens) =>
    localStorage.setItem("pos_tokens", JSON.stringify(tokens)),
  clear: () => localStorage.removeItem("pos_tokens"),
  getAccess: (): string | null => tokenStorage.get()?.access ?? null,
};

// ─── Core fetch wrapper ────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const access = tokenStorage.getAccess();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshTokens();
    if (refreshed) return apiFetch<T>(path, options, false);
    tokenStorage.clear();
    window.location.href = "/cashier/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? JSON.stringify(err));
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function refreshTokens(): Promise<boolean> {
  const tokens = tokenStorage.get();
  if (!tokens) return false;
  try {
    const res = await fetch(`${BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenStorage.set({ ...tokens, access: data.access });
    return true;
  } catch {
    return false;
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function login(creds: LoginCredentials): Promise<AuthTokens> {
  const data = await fetch(`${BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!data.ok) {
    const err = await data.json().catch(() => ({}));
    throw new Error(err.detail ?? "بيانات الدخول غير صحيحة");
  }
  const tokens: AuthTokens = await data.json();
  tokenStorage.set(tokens);
  return tokens;
}

export function logout(): void {
  tokenStorage.clear();
  window.location.href = "/cashier/login";
}

// ─── Products ──────────────────────────────────────────────────────────────
export async function searchProducts(query: string): Promise<Product[]> {
  return apiFetch<Product[]>(
    `/products/?search=${encodeURIComponent(query)}&limit=20`
  );
}

export async function getProductByBarcode(barcode: string): Promise<Product> {
  return apiFetch<Product>(`/products/?barcode=${encodeURIComponent(barcode)}`);
}

// ─── Customers ─────────────────────────────────────────────────────────────
export async function searchCustomers(query: string): Promise<Customer[]> {
  return apiFetch<Customer[]>(
    `/customers/?search=${encodeURIComponent(query)}&limit=10`
  );
}

// ─── Shifts ────────────────────────────────────────────────────────────────
export async function getCurrentShift(): Promise<Shift | null> {
  try {
    return await apiFetch<Shift>("/shifts/current/");
  } catch {
    return null;
  }
}

export async function openShift(payload: OpenShiftPayload): Promise<Shift> {
  return apiFetch<Shift>("/shifts/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function closeShift(
  id: string,
  payload: CloseShiftPayload
): Promise<Shift> {
  return apiFetch<Shift>(`/shifts/${id}/close/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Sales ─────────────────────────────────────────────────────────────────
export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  return apiFetch<Sale>("/sales/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSale(id: string): Promise<Sale> {
  return apiFetch<Sale>(`/sales/${id}/`);
}

export async function getSaleByInvoice(invoice: string): Promise<Sale> {
  return apiFetch<Sale>(`/sales/?invoice_number=${encodeURIComponent(invoice)}`);
}

// ─── Returns ───────────────────────────────────────────────────────────────
export async function createReturn(
  payload: CreateReturnPayload
): Promise<SaleReturn> {
  return apiFetch<SaleReturn>("/returns/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
