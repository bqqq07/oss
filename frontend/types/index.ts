// ─── Auth ──────────────────────────────────────────────────────────────────
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "owner" | "manager" | "cashier";
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export interface SalesSummary {
  total_sales: number;
  total_transactions: number;
  gross_profit: number;
  net_operating_profit: number;
  period: "day" | "week" | "month";
}

export interface PaymentMethodStats {
  method: string;
  amount: number;
  count: number;
  fee: number;
  fee_rate: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
  profit: number;
}

export interface CriticalProduct {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  category: string;
}

export interface EmployeePerformance {
  id: string;
  name: string;
  role: string;
  total_sales: number;
  transactions_count: number;
  average_transaction: number;
  shift_hours: number;
}

export interface DailyComparison {
  date: string;
  sales: number;
  profit: number;
  transactions: number;
}

export interface DashboardData {
  summary: {
    today: SalesSummary;
    week: SalesSummary;
    month: SalesSummary;
  };
  payment_methods: PaymentMethodStats[];
  top_products: TopProduct[];
  critical_products: CriticalProduct[];
  employee_performance: EmployeePerformance[];
  daily_comparison: DailyComparison[];
}

// ─── Reports ───────────────────────────────────────────────────────────────
export type ReportPeriod = "today" | "yesterday" | "week" | "month" | "custom";

export interface ReportFilters {
  period: ReportPeriod;
  start_date?: string;
  end_date?: string;
  employee_id?: string;
  category?: string;
}

export interface SalesReport {
  period: string;
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  gross_margin: number;
  operating_expenses: number;
  net_operating_profit: number;
  net_margin: number;
  transactions: number;
  returns: number;
  net_sales: number;
  payment_breakdown: PaymentMethodStats[];
  daily_data: DailyComparison[];
}

export interface ProductReport {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  quantity_sold: number;
  quantity_returned: number;
  net_quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface EmployeeReport {
  employee_id: string;
  employee_name: string;
  total_sales: number;
  transactions: number;
  returns: number;
  avg_basket: number;
  total_discounts: number;
  shift_count: number;
}

// ─── Alerts ────────────────────────────────────────────────────────────────
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType =
  | "low_stock"
  | "sync_conflict"
  | "large_return"
  | "discount_abuse"
  | "offline_pending"
  | "cash_discrepancy";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
}

// ─── Offline / Sync ────────────────────────────────────────────────────────
export type SyncStatus = "pending" | "syncing" | "synced" | "conflict" | "failed";

export interface SyncRecord {
  uuid: string;
  type: "invoice" | "return" | "cash_movement";
  payload: unknown;
  status: SyncStatus;
  created_at: string;
  synced_at?: string;
  error?: string;
  retry_count: number;
}

// ─── Invoice (Offline) ─────────────────────────────────────────────────────
export interface OfflineInvoiceItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface OfflineInvoice {
  uuid: string;
  invoice_no: string;
  cashier_id: string;
  cashier_name: string;
  items: OfflineInvoiceItem[];
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  change: number;
  created_at: string;
  shift_id: string;
  notes?: string;
}

// ─── Return (Offline) ──────────────────────────────────────────────────────
export interface OfflineReturn {
  uuid: string;
  original_invoice_uuid: string;
  items: Array<{
    product_id: string;
    quantity: number;
    reason: string;
  }>;
  refund_amount: number;
  refund_method: string;
  cashier_id: string;
  created_at: string;
}

// ─── Cash Movement (Offline) ───────────────────────────────────────────────
export interface OfflineCashMovement {
  uuid: string;
  type: "open_shift" | "close_shift" | "cash_in" | "cash_out";
  amount: number;
  cashier_id: string;
  shift_id: string;
  notes?: string;
  created_at: string;
}

// ─── Offline Product Cache ─────────────────────────────────────────────────
export interface OfflineProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  tax_rate: number;
  updated_at: string;
}
