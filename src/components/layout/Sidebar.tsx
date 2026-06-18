"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Warehouse,
  Truck,
  Receipt,
  Calculator,
  BarChart3,
  History,
  ScrollText,
  Settings,
  ChevronLeft,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui-store";
import { NAV_ITEMS, APP_NAME } from "@/lib/utils/constants";
import type { UserRole } from "@/lib/types";

// Icon map for dynamic rendering
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Warehouse,
  Truck,
  Receipt,
  Calculator,
  BarChart3,
  History,
  ScrollText,
  Settings,
};

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function Sidebar({
  userRole = "admin",
  userName = "Admin User",
  userEmail = "admin@gmail.com",
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  // Filter nav items by role
  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border sidebar-transition fixed top-0 left-0 z-40 print:hidden",
        sidebarCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-sidebar-border",
          sidebarCollapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-lg shrink-0">
          {APP_NAME.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar-text-transition">
            <h1 className="font-heading font-bold text-base text-foreground leading-tight truncate">
              {APP_NAME}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">POS System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
        {filteredNavItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-active-bg text-sidebar-active shadow-sm"
                  : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? item.title : undefined}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-active"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!sidebarCollapsed && (
                <span className="sidebar-text-transition">{item.title}</span>
              )}
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sidebar-active rounded-r-full" />
              )}
              {/* Badge */}
              {item.badge && item.badge > 0 && !sidebarCollapsed && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-semibold">
                  {item.badge}
                </span>
              )}
              {/* Tooltip for collapsed state */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.title}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section — User + Collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "w-5 h-5 transition-transform duration-300",
              sidebarCollapsed && "rotate-180"
            )}
          />
        </button>

        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg",
            sidebarCollapsed && "justify-center"
          )}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {userName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
          )}
          {!sidebarCollapsed && onSignOut && (
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
