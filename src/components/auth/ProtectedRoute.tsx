"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { hasPermission, type Resource, type Action } from "@/lib/utils/rbac";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  resource: Resource;
  action?: Action;
  fallback?: React.ReactNode;
}

/**
 * A wrapper component that protects routes based on user roles and permissions.
 * If the user lacks permission, they are redirected or shown a fallback UI.
 */
export function ProtectedRoute({
  children,
  resource,
  action = "read",
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, profile, isLoading } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !profile) {
      router.push("/login");
      return;
    }

    const authorized = hasPermission(profile.role, resource, action);
    setIsAuthorized(authorized);

    if (!authorized && !fallback) {
      // Default fallback behavior: redirect to dashboard if not authorized
      router.push("/");
    }
  }, [user, profile, isLoading, resource, action, fallback, router]);

  if (isLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    if (fallback) return <>{fallback}</>;
    return null; // Should have redirected
  }

  return <>{children}</>;
}
