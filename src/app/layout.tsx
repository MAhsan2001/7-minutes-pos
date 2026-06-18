import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/utils/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — POS System`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    `Professional Point of Sale system for ${APP_NAME}. Manage products, sales, stock, and reports with ease.`,
  keywords: ["bakery", "POS", "point of sale", APP_NAME, "Sri Lanka"],
  authors: [{ name: APP_NAME }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBF5" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0A09" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700;900&family=Roboto+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <SyncProvider>
              {children}
            </SyncProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  fontFamily: "var(--font-sans)",
                },
                classNames: {
                  success: "!bg-green-50 !text-green-800 !border-green-200 dark:!bg-green-950 dark:!text-green-200 dark:!border-green-800",
                  error: "!bg-red-50 !text-red-800 !border-red-200 dark:!bg-red-950 dark:!text-red-200 dark:!border-red-800",
                  warning: "!bg-yellow-50 !text-yellow-800 !border-yellow-200 dark:!bg-yellow-950 dark:!text-yellow-200 dark:!border-yellow-800",
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
