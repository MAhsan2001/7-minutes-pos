import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper precedence handling.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as LKR currency (Sri Lankan Rupee).
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  return `Rs.${(num || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a number as LKR currency without decimals (for display in cards).
 */
export function formatCurrencyShort(amount: number | string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (num >= 1_000_000) {
    return `Rs.${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `Rs.${(num / 1_000).toFixed(1)}K`;
  }
  return `Rs.${num.toFixed(0)}`;
}

/**
 * Format a date to a human-readable string.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date and time.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format time only.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a relative time (e.g., "2 minutes ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d);
}

/**
 * Generate a sequential 6-digit invoice number that resets every day.
 * Tracks the sequence in local storage.
 * e.g., 000001, 000002...
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  // Adjust for local time to avoid midnight issues
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const today = localDate.toISOString().slice(0, 10); // "2026-06-17"
  const datePrefix = today.replace(/-/g, "").slice(2); // "260617"

  if (typeof window !== "undefined") {
    const lastDate = localStorage.getItem("pos_invoice_date");
    let sequence = parseInt(localStorage.getItem("pos_invoice_sequence") || "0", 10);

    if (lastDate !== today) {
      sequence = 1;
      localStorage.setItem("pos_invoice_date", today);
    } else {
      sequence += 1;
    }
    
    localStorage.setItem("pos_invoice_sequence", sequence.toString());
    
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${datePrefix}${sequence.toString().padStart(4, "0")}-${randomSuffix}`;
  }

  // Fallback if window is undefined
  const randomSequence = Math.floor(Math.random() * 9999) + 1;
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${datePrefix}${randomSequence.toString().padStart(4, "0")}-${randomSuffix}`;
}

/**
 * Calculate percentage change.
 */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Get initials from a name (for avatars).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a random SKU.
 */
export function generateSKU(categoryPrefix: string = "PRD"): string {
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${categoryPrefix}-${random}`;
}
