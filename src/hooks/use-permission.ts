import { useAuthStore } from "@/lib/stores/auth-store";
import { hasPermission, type Resource, type Action } from "@/lib/utils/rbac";

/**
 * Hook to check if the current user has permission to perform an action on a resource.
 */
export function usePermission() {
  const getRole = useAuthStore((state) => state.getRole);
  const role = getRole();

  const checkPermission = (resource: Resource, action: Action): boolean => {
    return hasPermission(role, resource, action);
  };

  return {
    role,
    hasPermission: checkPermission,
    isAdmin: role === "admin",
    isCashier: role === "cashier",
    isStockManager: role === "stock_manager",
    isAccountant: role === "accountant",
  };
}
