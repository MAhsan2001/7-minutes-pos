/* ============================================
   7 Minutes — Type Definitions
   ============================================ */

// ─── User & Auth ───────────────────────────────

export type UserRole = "admin" | "cashier" | "stock_manager" | "accountant";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// ─── ERP Features: Promotions ────────────────────

export type PromotionType = "discount_percentage" | "discount_fixed" | "bogo" | "bundle_fixed_price";
export type PromotionTargetType = "all" | "category" | "product" | "combo";

export interface ComboItem {
  product_id: string;
  variant_id?: string | null;
  required_addons?: string[];
  quantity: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  target_type: PromotionTargetType;
  target_id: string | null;
  value: number;
  min_quantity: number;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  combo_items: ComboItem[] | null;
  is_active: boolean;
  created_at: string;
}

// ─── ERP Features: Customers & Ledgers ───────────

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  vat_number: string | null;
  total_credit_due: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LedgerEntryType = "credit_sale" | "payment" | "adjustment";

export interface CustomerLedger {
  id: string;
  customer_id: string;
  sale_id: string | null;
  type: LedgerEntryType;
  amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  customer?: Customer;
  user?: Profile;
}

// ─── Products ──────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: { products: number };
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  cost?: number;
  sku?: string;
  is_active: boolean;
}

export interface ProductAddon {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
  cost_price: number;
  barcode: string;
  sku: string;
  min_stock_level: number;
  is_active: boolean;
  image_url?: string;
  stock_quantity?: number;
  low_stock_threshold?: number;
  unit?: ProductUnit;
  category?: { name: string };
  variants?: ProductVariant[];
  addons?: ProductAddon[];
}

export type ProductUnit = "piece" | "kg" | "dozen" | "pack" | "loaf";

// ─── Sales ─────────────────────────────────────

export interface Sale {
  id: string;
  invoice_number: string;
  cashier_id: string;
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  shift_cashier_name: string | null;
  status: SaleStatus;
  notes: string | null;
  customer_id: string | null;
  vat_amount: number;
  sscl_amount: number;
  is_credit: boolean;
  change_amount?: number;
  created_at: string;
  updated_at: string;
  cashier?: Profile;
  customer?: Customer;
  items?: SaleItem[];
}

export type PaymentMethod = "cash" | "card" | "mobile";
export type SaleStatus = "completed" | "refunded" | "void";

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_amount: number;
  sscl_amount: number;
  product?: Product;
  variant?: ProductVariant;
}

// ─── Cart (Client-side) ────────────────────────

export interface CartItem {
  cart_item_id?: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
  unit?: string;
  max_stock?: number;
  addons?: {
    id: string;
    name: string;
    price: number;
  }[];
}

// ─── Stock ─────────────────────────────────────

export type StockMovementType =
  | "purchase"
  | "sale"
  | "adjustment"
  | "wastage"
  | "damage"
  | "return";

export interface StockMovement {
  id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  product?: Product;
  user?: Profile;
}

// ─── Suppliers & Purchases ─────────────────────

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PurchaseStatus = "pending" | "received" | "cancelled";

export interface Purchase {
  id: string;
  supplier_id: string;
  purchase_number: string;
  total_amount: number;
  status: PurchaseStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

// ─── Daily Tally ───────────────────────────────

export interface DailyTally {
  id: string;
  date: string;
  total_sales: number;
  bakery_expense: number;
  utility_expense: number;
  other_expense: number;
  cash_in: number;
  cash_out: number;
  opening_balance: number;
  closing_balance: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

// ─── Price History ─────────────────────────────

export interface PriceHistory {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  changed_by: string;
  created_at: string;
  product?: Product;
  user?: Profile;
}

// ─── Audit Logs ────────────────────────────────

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "void_sale"
  | "refund";

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  resource: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: Profile;
}

// ─── Settings ──────────────────────────────────

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BakerySettings {
  bakery_name: string;
  address: string;
  phone: string;
  logo_url: string | null;
  receipt_header: string;
  receipt_footer: string;
  auto_print: boolean;
  receipt_width: "58mm" | "80mm";
  currency_symbol: string;
  tax_rate: number;
  theme: "light" | "dark" | "system";
  shift_cashiers: string[];
}

// ─── Reports ───────────────────────────────────

export interface DailySalesReport {
  date: string;
  total_sales: number;
  total_orders: number;
  average_order: number;
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  category_name: string;
}

export interface StockReport {
  product_id: string;
  product_name: string;
  current_stock: number;
  stock_value: number;
  low_stock_threshold: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

// ─── UI State ──────────────────────────────────

export interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  roles: UserRole[];
  children?: NavItem[];
}
