// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  permissions: string[];
  roles: string[];
}

// ─── Common ───────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  detail?: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  is_active: boolean;
}

// ─── Supplier ─────────────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface SupplierFormData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
  is_active: boolean;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────
export interface PurchaseItem {
  id: string;
  product: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Purchase {
  id: string;
  invoice_number: string;
  supplier: string;
  supplier_name: string;
  items: PurchaseItem[];
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'received' | 'cancelled';
  notes?: string;
  invoice_date: string;
  created_at: string;
}

export interface PurchaseItemFormData {
  product: string;
  quantity: number;
  unit_cost: number;
}

export interface PurchaseFormData {
  supplier: string;
  items: PurchaseItemFormData[];
  paid_amount: number;
  notes?: string;
  invoice_date: string;
}

// ─── Employee ─────────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  salary: number;
  hire_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeFormData {
  full_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  salary: number;
  hire_date?: string;
  is_active: boolean;
}

// ─── Expense ──────────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'supplies'
  | 'maintenance'
  | 'marketing'
  | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  expense_date: string;
  created_by?: string;
  created_at: string;
}

export interface ExpenseFormData {
  title: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  expense_date: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export type MovementType = 'in' | 'out' | 'adjustment';

export interface InventoryMovement {
  id: string;
  product: string;
  product_name: string;
  movement_type: MovementType;
  quantity: number;
  notes?: string;
  reference?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  product: string;
  product_name: string;
  sku: string;
  current_stock: number;
  min_stock_level: number;
  is_low_stock: boolean;
}
