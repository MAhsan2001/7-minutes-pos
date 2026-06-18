/* ============================================
   7 Minutes — Constants
   ============================================ */

import type { NavItem, UserRole, BakerySettings } from "@/lib/types";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "7 Minutes";

// ─── Navigation ────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: "LayoutDashboard",
    roles: ["admin", "cashier", "stock_manager", "accountant"],
  },
  {
    title: "POS",
    href: "/pos",
    icon: "ShoppingCart",
    roles: ["admin", "cashier"],
  },
  {
    title: "Customers (Naya)",
    href: "/customers",
    icon: "Users",
    roles: ["admin", "cashier", "accountant"],
  },
  {
    title: "Products",
    href: "/products",
    icon: "Package",
    roles: ["admin", "cashier", "stock_manager", "accountant"],
  },
  {
    title: "Promotions",
    href: "/promotions",
    icon: "Percent",
    roles: ["admin", "stock_manager"],
  },
  {
    title: "Barcodes",
    href: "/barcodes",
    icon: "Barcode",
    roles: ["admin", "stock_manager"],
  },
  {
    title: "Categories",
    href: "/categories",
    icon: "Tags",
    roles: ["admin"],
  },
  {
    title: "Stock",
    href: "/stock",
    icon: "Warehouse",
    roles: ["admin", "stock_manager", "accountant"],
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: "Truck",
    roles: ["admin", "stock_manager", "accountant"],
  },
  {
    title: "Sales",
    href: "/sales",
    icon: "Receipt",
    roles: ["admin", "cashier", "accountant"],
  },
  {
    title: "Daily Tally",
    href: "/daily-tally",
    icon: "Calculator",
    roles: ["admin", "accountant"],
  },
  {
    title: "Accounting",
    href: "/accounting",
    icon: "Landmark",
    roles: ["admin", "accountant"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: "BarChart3",
    roles: ["admin", "cashier", "stock_manager", "accountant"],
  },
  {
    title: "Price History",
    href: "/price-history",
    icon: "History",
    roles: ["admin", "accountant"],
  },
  {
    title: "Audit Logs",
    href: "/audit-logs",
    icon: "ScrollText",
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: "Settings",
    roles: ["admin"],
  },
];

// ─── Role Labels ───────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  cashier: "Cashier",
  stock_manager: "Stock Manager",
  accountant: "Accountant",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-primary text-primary-foreground",
  cashier: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  stock_manager: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  accountant: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

// ─── Payment Methods ───────────────────────────

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "Banknote" },
  { value: "card", label: "Card", icon: "CreditCard" },
  { value: "mobile", label: "Mobile", icon: "Smartphone" },
] as const;

// ─── Quick Cash Denominations (LKR) ────────────

export const CASH_DENOMINATIONS = [50, 100, 200, 500, 1000, 5000] as const;

// ─── Stock Movement Types ──────────────────────

export const STOCK_MOVEMENT_TYPES = [
  { value: "purchase", label: "Purchase", color: "text-green-600" },
  { value: "sale", label: "Sale", color: "text-blue-600" },
  { value: "adjustment", label: "Adjustment", color: "text-yellow-600" },
  { value: "wastage", label: "Wastage", color: "text-red-600" },
  { value: "damage", label: "Damage", color: "text-red-800" },
  { value: "return", label: "Return", color: "text-purple-600" },
] as const;

// ─── Product Units ─────────────────────────────

export const PRODUCT_UNITS = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kilogram" },
  { value: "dozen", label: "Dozen" },
  { value: "pack", label: "Pack" },
  { value: "loaf", label: "Loaf" },
] as const;

// ─── Sale Status ───────────────────────────────

export const SALE_STATUS_CONFIG = {
  completed: { label: "Completed", color: "badge-success" },
  refunded: { label: "Refunded", color: "badge-warning" },
  void: { label: "Void", color: "badge-destructive" },
} as const;

// ─── Default Bakery Settings ───────────────────

export const DEFAULT_BAKERY_SETTINGS: BakerySettings = {
  bakery_name: APP_NAME,
  address: "123 Main Street, Colombo, Sri Lanka",
  phone: "+94-XX-XXXXXXX",
  logo_url: null,
  receipt_header: `Welcome to ${APP_NAME}!`,
  receipt_footer: "Thank you! Visit again!",
  auto_print: false,
  receipt_width: "80mm",
  currency_symbol: "Rs.",
  tax_rate: 0,
  theme: "system",
  shift_cashiers: [],
};

// ─── Chart Colors ──────────────────────────────

export const CHART_COLORS = {
  primary: "#C2410C",
  secondary: "#78350F",
  accent: "#FED7AA",
  success: "#16A34A",
  warning: "#D97706",
  destructive: "#DC2626",
  palette: [
    "#C2410C",
    "#D97706",
    "#16A34A",
    "#2563EB",
    "#9333EA",
    "#E11D48",
    "#0891B2",
    "#4F46E5",
  ],
};

export const CHART_COLORS_DARK = {
  primary: "#FB923C",
  secondary: "#D97706",
  accent: "#431407",
  success: "#4ADE80",
  warning: "#FBBF24",
  destructive: "#F87171",
  palette: [
    "#FB923C",
    "#FBBF24",
    "#4ADE80",
    "#60A5FA",
    "#C084FC",
    "#FB7185",
    "#22D3EE",
    "#818CF8",
  ],
};

// ─── Pagination ────────────────────────────────

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

// ─── Breakpoints ───────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
