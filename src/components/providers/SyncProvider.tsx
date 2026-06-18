"use client";

import { useEffect, useCallback } from "react";
import { useUIStore } from "@/lib/stores/ui-store";
import { db } from "@/lib/db/dexie";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, setIsOnline, setPendingSyncCount } = useUIStore();
  const supabase = createClient();

  // Initialize online status & event listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await db.pendingSales.count();
      setPendingSyncCount(count);
    } catch (e) {
      console.error("Failed to count pending sales:", e);
    }
  }, [setPendingSyncCount]);

  // Sync engine
  useEffect(() => {
    updatePendingCount();

    if (!isOnline) return;

    const syncPendingSales = async () => {
      try {
        const pendingSales = await db.pendingSales.toArray();
        
        if (pendingSales.length === 0) return;
        
        toast.info(`Syncing ${pendingSales.length} offline sales...`);

        let successCount = 0;
        let failCount = 0;

        for (const sale of pendingSales) {
          try {
            const { error } = await supabase.rpc("complete_sale", sale.payload);
            if (error) throw error;
            
            // If successful, remove from indexedDB
            if (sale.id) await db.pendingSales.delete(sale.id);
            successCount++;
          } catch (err) {
            console.error("Failed to sync sale:", sale.payload.p_invoice_number, err);
            failCount++;
          }
        }

        updatePendingCount();

        if (successCount > 0) {
          toast.success(`Successfully synced ${successCount} offline sales!`);
        }
        if (failCount > 0) {
          toast.error(`Failed to sync ${failCount} sales. Will retry later.`);
        }

      } catch (e) {
        console.error("Sync error:", e);
      }
    };

    syncPendingSales();
    
    // Set up an interval to keep trying to sync if online
    const interval = setInterval(() => {
      if (useUIStore.getState().isOnline) {
         syncPendingSales();
      }
    }, 60000); // Check every minute just in case

    return () => clearInterval(interval);

  }, [isOnline, supabase, updatePendingCount]);

  return <>{children}</>;
}
