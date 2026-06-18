"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, setIsOnline, setGlobalStoreName } = useUIStore();
  const { user, profile, setUser, setProfile } = useAuthStore();
  const router = useRouter();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  // Fetch global store name on mount
  useEffect(() => {
    async function fetchStoreName() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "bakery_profile")
          .single();
        
        if (data && data.value && data.value.bakery_name) {
          setGlobalStoreName(data.value.bakery_name);
        }
      } catch (error) {
        console.error("Failed to load store name", error);
      }
    }
    fetchStoreName();
  }, [setGlobalStoreName]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      toast.success("Signed out successfully");
      router.push("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      <Sidebar
        userRole={profile?.role || "cashier"}
        userName={profile?.full_name || "User"}
        userEmail={user?.email || ""}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 print:pl-0 print:bg-white",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        {/* Top Bar */}
        <div className="print:hidden">
          <TopBar
            userRole={profile?.role || "cashier"}
            userName={profile?.full_name || "User"}
            userEmail={user?.email || ""}
            onSignOut={handleSignOut}
          />
        </div>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8 animate-fade-in print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
