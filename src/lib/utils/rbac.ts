import type { UserRole } from "@/lib/types";

export type Resource =
  | "dashboard"
  | "pos"
  | "products"
  | "categories"
  | "stock"
  | "sales"
  | "daily_tally"
  | "reports"
  | "price_history"
  | "audit_logs"
  | "settings"
  | "suppliers"
  | "customers"
  | "accounting"
  | "barcodes"
  | "promotions";

export type Action = "create" | "read" | "update" | "delete";

// Hardcoded permission matrix for fast synchronous UI rendering.
// True enforcement happens at the Database RLS level.
export const PERMISSIONS_MATRIX: Record<UserRole, Partial<Record<Resource, Action[]>>> = {
  admin: {
    dashboard: ["read"],
    pos: ["create", "read"],
    products: ["create", "read", "update", "delete"],
    categories: ["create", "read", "update", "delete"],
    stock: ["create", "read", "update"],
    sales: ["create", "read", "update", "delete"],
    daily_tally: ["create", "read", "update"],
    reports: ["read"],
    price_history: ["read"],
    audit_logs: ["read"],
    settings: ["read", "update"],
    suppliers: ["create", "read", "update", "delete"],
    customers: ["create", "read", "update", "delete"],
    accounting: ["read"],
    barcodes: ["read", "create"],
    promotions: ["create", "read", "update", "delete"],
  },
  cashier: {
    dashboard: ["read"],
    pos: ["create", "read"],
    products: ["read"],
    sales: ["create", "read"],
    reports: ["read"],
    customers: ["create", "read", "update"],
    promotions: ["read"],
  },
  stock_manager: {
    dashboard: ["read"],
    products: ["read"],
    stock: ["create", "read", "update"],
    suppliers: ["create", "read", "update"],
    reports: ["read"],
    barcodes: ["read", "create"],
    promotions: ["read"],
  },
  accountant: {
    dashboard: ["read"],
    products: ["read"],
    stock: ["read"],
    sales: ["read"],
    daily_tally: ["create", "read", "update"],
    reports: ["read"],
    price_history: ["read"],
    suppliers: ["read"],
    customers: ["read"],
    accounting: ["read"],
  },
};

/**
 * Check if a given role has permission to perform an action on a resource.
 * This is used for UI rendering (e.g., hiding buttons).
 */
export function hasPermission(
  role: UserRole | undefined | null,
  resource: Resource,
  action: Action
): boolean {
  if (!role) return false;
  
  const rolePermissions = PERMISSIONS_MATRIX[role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}
