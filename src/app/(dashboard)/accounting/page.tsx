"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePermission } from "@/hooks/use-permission";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import {
  Landmark,
  Calculator,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CalendarDays,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_BAKERY_SETTINGS } from "@/lib/utils/constants";
import { startOfMonth, endOfMonth, format } from "date-fns";

export default function AccountingPage() {
  const { hasPermission } = usePermission();
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [totalSales, setTotalSales] = useState(0);
  const [totalVAT, setTotalVAT] = useState(0);
  const [totalSSCL, setTotalSSCL] = useState(0);
  const [totalCreditIssued, setTotalCreditIssued] = useState(0);
  const [totalCreditCollected, setTotalCreditCollected] = useState(0);

  const supabase = createClient();
  const currencySymbol = DEFAULT_BAKERY_SETTINGS.currency_symbol;

  useEffect(() => {
    fetchFinancials();
  }, []);

  async function fetchFinancials() {
    setIsLoading(true);
    try {
      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();

      // 1. Fetch Sales within this month
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("total_amount, vat_amount, sscl_amount, is_credit")
        .gte("created_at", start)
        .lte("created_at", end)
        .eq("status", "completed");

      if (salesError) throw salesError;

      let salesTotal = 0;
      let vatTotal = 0;
      let ssclTotal = 0;
      let creditIssued = 0;

      if (salesData) {
        salesData.forEach(sale => {
          salesTotal += Number(sale.total_amount) || 0;
          vatTotal += Number(sale.vat_amount) || 0;
          ssclTotal += Number(sale.sscl_amount) || 0;
          if (sale.is_credit) {
            // Technically we need to calculate exact credit issued if partially paid,
            // but for simplicity, assuming whole amount or partial
            // Wait, we didn't save `credit_amount` in `sales`.
            // We'll rely on the `customer_ledgers` instead!
          }
        });
      }

      // 2. Fetch Ledgers within this month
      const { data: ledgerData, error: ledgerError } = await supabase
        .from("customer_ledgers")
        .select("type, amount")
        .gte("created_at", start)
        .lte("created_at", end);

      if (ledgerError) throw ledgerError;

      let cIssued = 0;
      let cCollected = 0;

      if (ledgerData) {
        ledgerData.forEach(l => {
          if (l.type === "credit_sale") {
            cIssued += Number(l.amount) || 0;
          } else if (l.type === "payment") {
            cCollected += Number(l.amount) || 0;
          }
        });
      }

      setTotalSales(salesTotal);
      setTotalVAT(vatTotal);
      setTotalSSCL(ssclTotal);
      setTotalCreditIssued(cIssued);
      setTotalCreditCollected(cCollected);

    } catch (error) {
      console.error("Error fetching financials:", error);
      toast.error("Failed to load financial data");
    } finally {
      setIsLoading(false);
    }
  }

  const StatCard = ({ title, value, icon: Icon, description, trend, trendType }: any) => (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn(
            "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full",
            trendType === "positive" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {trendType === "positive" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-muted-foreground font-medium mb-1">{title}</h3>
      <p className="text-3xl font-heading font-bold text-foreground">
        {currencySymbol} {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
    </div>
  );

  return (
    <ProtectedRoute resource="reports" action="read">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Landmark className="w-6 h-6 text-primary" />
              Accounting Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Financial overview and tax liability for {format(new Date(), "MMMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground font-medium rounded-xl hover:bg-muted-foreground/10 transition-colors">
              <CalendarDays className="w-4 h-4" />
              This Month
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
              <FileText className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-card border border-border rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading financial data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <StatCard 
              title="Total Sales" 
              value={totalSales} 
              icon={Calculator}
              description="Total sales value" 
              trend="+12.5%" 
              trendType="positive"
            />

            <StatCard 
              title="Credit Issued (Udhar)" 
              value={totalCreditIssued} 
              icon={ArrowUpRight}
              description="Total new credit given to customers this month" 
              trendType="destructive"
            />

            <StatCard 
              title="Credit Collected" 
              value={totalCreditCollected} 
              icon={ArrowDownRight}
              description="Total past credit recovered this month" 
              trendType="positive"
            />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
