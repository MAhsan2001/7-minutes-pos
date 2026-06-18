"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePermission } from "@/hooks/use-permission";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import type { Customer, CustomerLedger } from "@/lib/types";
import {
  ArrowLeft,
  Loader2,
  Banknote,
  Receipt,
  UserCircle,
  Phone,
  Mail,
  MapPin,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_BAKERY_SETTINGS } from "@/lib/utils/constants";
import { format } from "date-fns";

export default function CustomerLedgerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canRead = hasPermission("customers", "read");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledgers, setLedgers] = useState<CustomerLedger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();
  const currencySymbol = DEFAULT_BAKERY_SETTINGS.currency_symbol;

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  async function fetchCustomerData() {
    setIsLoading(true);
    try {
      // Fetch Customer
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData as Customer);

      // Fetch Ledgers
      const { data: ledgerData, error: ledgerError } = await supabase
        .from("customer_ledgers")
        .select(`
          *,
          user:profiles!customer_ledgers_created_by_fkey(full_name)
        `)
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (ledgerError) throw ledgerError;
      setLedgers(ledgerData as unknown as CustomerLedger[]);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast.error("Failed to load customer details");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading ledger...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-card border border-border rounded-xl">
        <UserCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-medium text-foreground">Customer not found</p>
        <button 
          onClick={() => router.push("/customers")}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <ProtectedRoute resource="customers" action="read">
      <div className="space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Customer Ledger (Naya Potha)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Viewing transaction history for {customer.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Details Card */}
          <div className="col-span-1 glass rounded-2xl p-6 border border-white/20 dark:border-stone-700/50 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary text-xl font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-full text-xs font-semibold",
                  customer.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                )}>
                  {customer.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{customer.address}</span>
                </div>
              )}
              {customer.vat_number && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Receipt className="w-4 h-4" />
                  <span>VAT: {customer.vat_number}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Total Credit Due (Udhar)</p>
              <p className={cn(
                "text-3xl font-mono font-bold",
                customer.total_credit_due > 0 ? "text-destructive" : "text-success"
              )}>
                {currencySymbol} {customer.total_credit_due.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Ledger History */}
          <div className="col-span-1 md:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Transaction History
              </h3>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {ledgers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-foreground font-medium">No transactions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    When this customer buys on credit or makes a payment, it will appear here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date & Time</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium text-right">Amount</th>
                      <th className="px-6 py-3 font-medium">Notes</th>
                      <th className="px-6 py-3 font-medium">Cashier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {ledgers.map((ledger) => (
                      <tr key={ledger.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(ledger.created_at), "MMM d, yyyy h:mm a")}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {ledger.type === "credit_sale" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive font-medium text-xs">
                              <Receipt className="w-3.5 h-3.5" /> Credit Sale
                            </span>
                          ) : ledger.type === "payment" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success font-medium text-xs">
                              <Banknote className="w-3.5 h-3.5" /> Payment
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium text-xs">
                              Adjustment
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold">
                          <span className={ledger.type === "payment" ? "text-success" : "text-destructive"}>
                            {ledger.type === "payment" ? "-" : "+"}{currencySymbol} {ledger.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate" title={ledger.notes || ""}>
                          {ledger.notes || "-"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {(ledger.user as any)?.full_name || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
