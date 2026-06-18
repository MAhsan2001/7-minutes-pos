"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
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
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, APP_NAME } from "@/lib/utils/constants";
import type { UserRole } from "@/lib/types";

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

interface MobileNavProps {
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function MobileNav({
  userRole = "admin",
  userName = "Admin User",
  userEmail = "admin@gmail.com",
  onSignOut,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* Hamburger Button — visible on mobile/tablet */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-6 h-6 text-foreground" />
      </button>

      {/* Overlay + Sheet via Portal */}
      {mounted && isOpen && createPortal(
        <div className="portal-root">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed inset-y-0 left-0 z-[100] w-[280px] bg-sidebar border-r border-sidebar-border lg:hidden animate-slide-in-left flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-lg shrink-0">
                  {APP_NAME.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 pr-2">
                  <h1 className="font-heading font-bold text-base text-foreground leading-tight truncate">
                    {APP_NAME}
                  </h1>
                  <p className="text-xs text-muted-foreground font-medium">
                    POS System
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
              {filteredNavItems.map((item, index) => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 animate-fade-in-up touch-target",
                      isActive
                        ? "bg-sidebar-active-bg text-sidebar-active"
                        : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0",
                        isActive
                          ? "text-sidebar-active"
                          : "text-muted-foreground"
                      )}
                    />
                    <span>{item.title}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="border-t border-sidebar-border p-3">
              <div className="flex items-center gap-3 p-2 rounded-lg">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onSignOut();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors touch-target"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
