// ─── Auth ──────────────────────────────────────────────────────────────────
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// ─── Product ───────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  category?: string;
  image?: string;
}

// ─── Customer ──────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  balance?: number;
}

// ─── Cart ──────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product;
  qty: number;
  unitPrice: number;
  discountPct: number; // 0–100
  discountAmt: number;
  total: number;
}

// ─── Payment ───────────────────────────────────────────────────────────────
export type PaymentMethod = "cash" | "mada" | "visa";

export interface PaymentSplit {
  cash: number;
  mada: number;
  visa: number;
}

// ─── Sale ──────────────────────────────────────────────────────────────────
export interface SaleItem {
  product: string; // product id
  qty: number;
  unit_price: number;
  discount_pct: number;
  discount_amt: number;
  total: number;
}

export interface CreateSalePayload {
  customer?: string;
  shift: string;
  items: SaleItem[];
  discount_pct: number;
  discount_amt: number;
  subtotal: number;
  total: number;
  payments: { method: PaymentMethod; amount: number }[];
  notes?: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer?: Customer;
  items: SaleItem[];
  subtotal: number;
  discount_pct: number;
  discount_amt: number;
  total: number;
  payments: { method: PaymentMethod; amount: number }[];
  created_at: string;
}

// ─── Return ────────────────────────────────────────────────────────────────
export interface ReturnItem {
  sale_item: string;
  product: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface CreateReturnPayload {
  sale: string;
  shift: string;
  items: ReturnItem[];
  reason: string;
  refund_method: PaymentMethod;
  total: number;
}

export interface SaleReturn {
  id: string;
  sale: string;
  items: ReturnItem[];
  total: number;
  reason: string;
  refund_method: PaymentMethod;
  created_at: string;
}

// ─── Shift ─────────────────────────────────────────────────────────────────
export interface Shift {
  id: string;
  cashier: string;
  opening_cash: number;
  closing_cash?: number;
  status: "open" | "closed";
  opened_at: string;
  closed_at?: string;
  total_sales?: number;
  total_returns?: number;
}

export interface OpenShiftPayload {
  opening_cash: number;
}

export interface CloseShiftPayload {
  closing_cash: number;
  notes?: string;
}
