"use client";

import { Bell, Search, Wifi, WifiOff } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

interface TopBarProps {
  pageTitle?: string;
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function TopBar({
  pageTitle = "Dashboard",
  userRole = "admin",
  userName = "Admin User",
  userEmail = "admin@gmail.com",
  onSignOut,
}: TopBarProps) {
  const { isOnline, sidebarCollapsed, pendingSyncCount, setCommandPaletteOpen } = useUIStore();

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You&apos;re offline. Changes will sync when reconnected.</span>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border",
          "lg:pl-6"
        )}
      >
        {/* Left Side — Mobile Nav + Title */}
        <div className="flex items-center gap-3">
          <MobileNav
            userRole={userRole}
            userName={userName}
            userEmail={userEmail}
            onSignOut={onSignOut}
          />
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">
              {pageTitle}
            </h2>
          </div>
        </div>

        {/* Right Side — Actions */}
        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          <div
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
              isOnline
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
            )}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {pendingSyncCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
              <span className="animate-pulse w-2 h-2 rounded-full bg-warning"></span>
              <span>{pendingSyncCount} pending</span>
            </div>
          )}

          {/* Search (desktop only) */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-sm"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
            <span className="hidden lg:inline">Search...</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-background text-[10px] font-mono border border-border">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {/* Notification badge — can be dynamic */}
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      <CommandPalette />
    </>
  );
}
