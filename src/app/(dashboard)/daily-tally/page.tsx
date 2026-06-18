"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { DailyTally } from "@/lib/types";
import {
  Calculator,
  History,
  Save,
  Loader2,
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Banknote
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";

export default function DailyTallyPage() {
  const [activeTab, setActiveTab] = useState("tally");
  const [tallies, setTallies] = useState<DailyTally[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form State
  const todayDate = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [isFetchingDay, setIsFetchingDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [existingTallyId, setExistingTallyId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    opening_balance: 0,
    total_sales: 0,
    bakery_expense: 0,
    utility_expense: 0,
    other_expense: 0,
    cash_in: 0,
    cash_out: 0,
    notes: "",
  });

  const { profile } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "tally") {
      loadDayData(selectedDate);
    }
  }, [selectedDate, activeTab]);

  async function fetchHistory() {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("daily_tally")
        .select("*, user:profiles(full_name)")
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      setTallies(data as DailyTally[]);
    } catch (error: any) {
      console.error("Error fetching tallies:", error);
      toast.error(error.message || "Failed to load tally history");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function loadDayData(dateString: string) {
    setIsFetchingDay(true);
    try {
      // 1. Check if a tally already exists for this date
      const { data: existingTally, error: tallyError } = await supabase
        .from("daily_tally")
        .select("*")
        .eq("date", dateString)
        .maybeSingle();

      if (tallyError) throw tallyError;

      if (existingTally) {
        // Edit mode
        setExistingTallyId(existingTally.id);
        setFormData({
          opening_balance: Number(existingTally.opening_balance),
          total_sales: Number(existingTally.total_sales),
          bakery_expense: Number(existingTally.bakery_expense),
          utility_expense: Number(existingTally.utility_expense),
          other_expense: Number(existingTally.other_expense),
          cash_in: Number(existingTally.cash_in),
          cash_out: Number(existingTally.cash_out),
          notes: existingTally.notes || "",
        });
      } else {
        // Create mode: fetch previous day's closing balance + today's sales
        setExistingTallyId(null);
        
        // Find previous tally for opening balance
        const { data: prevTally } = await supabase
          .from("daily_tally")
          .select("closing_balance")
          .lt("date", dateString)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const openingBal = prevTally ? Number(prevTally.closing_balance) : 0;

        // Calculate today's sales
        const startOfDay = new Date(dateString);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateString);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: sales, error: salesError } = await supabase
          .from("sales")
          .select("total_amount")
          .eq("status", "completed")
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());

        if (salesError) throw salesError;

        const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);

        setFormData({
          opening_balance: openingBal,
          total_sales: totalSales,
          bakery_expense: 0,
          utility_expense: 0,
          other_expense: 0,
          cash_in: 0,
          cash_out: 0,
          notes: "",
        });
      }
    } catch (error: any) {
      console.error("Error loading day data:", error);
      toast.error(error.message || "Failed to load data for selected date");
    } finally {
      setIsFetchingDay(false);
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (field === "notes") {
      setFormData({ ...formData, [field]: value });
      return;
    }
    const numValue = value === "" ? 0 : parseFloat(value);
    setFormData({ ...formData, [field]: isNaN(numValue) ? 0 : numValue });
  };

  const getClosingBalance = () => {
    return (
      formData.opening_balance +
      formData.total_sales +
      formData.cash_in -
      formData.bakery_expense -
      formData.utility_expense -
      formData.other_expense -
      formData.cash_out
    );
  };

  const handleSaveTally = async () => {
    if (!profile?.id) return;
    setIsSubmitting(true);
    
    try {
      const payload = {
        date: selectedDate,
        opening_balance: formData.opening_balance,
        total_sales: formData.total_sales,
        bakery_expense: formData.bakery_expense,
        utility_expense: formData.utility_expense,
        other_expense: formData.other_expense,
        cash_in: formData.cash_in,
        cash_out: formData.cash_out,
        closing_balance: getClosingBalance(),
        notes: formData.notes || null,
        created_by: profile.id,
      };

      if (existingTallyId) {
        // Update
        const { error } = await supabase
          .from("daily_tally")
          .update(payload)
          .eq("id", existingTallyId);
        if (error) throw error;
        toast.success("Daily tally updated successfully");
      } else {
        // Insert
        const { error } = await supabase
          .from("daily_tally")
          .insert([payload]);
        if (error) throw error;
        toast.success("Daily tally recorded successfully");
      }

      // Reload to set to edit mode instantly
      loadDayData(selectedDate);
    } catch (error: any) {
      console.error("Error saving tally:", error);
      toast.error(error.message || "Failed to save daily tally");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute resource="reports" action="read">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Daily Tally</h1>
          <p className="text-sm text-muted-foreground mt-1">
            End of day reconciliation, expense tracking, and cash flow analysis.
          </p>
        </div>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="flex border-b border-border w-full mb-6">
            <Tabs.Trigger
              value="tally"
              className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Tally Worksheet
            </Tabs.Trigger>
            <Tabs.Trigger
              value="history"
              className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Tally History
            </Tabs.Trigger>
          </Tabs.List>

          {/* TAB 1: TALLY WORKSHEET */}
          <Tabs.Content value="tally" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Header / Date Selection */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Select Date</h3>
                  <input
                    type="date"
                    value={selectedDate}
                    max={todayDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-foreground focus:outline-none font-medium cursor-pointer"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isFetchingDay ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculating...
                  </div>
                ) : existingTallyId ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <History className="w-3.5 h-3.5" />
                    Editing existing tally
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    <AlertCircle className="w-3.5 h-3.5" />
                    New tally for this date
                  </span>
                )}
              </div>
            </div>

            {/* Tally Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-100 transition-opacity" style={{ opacity: isFetchingDay ? 0.5 : 1, pointerEvents: isFetchingDay ? 'none' : 'auto' }}>
              
              {/* Column 1: Cash In & Sales */}
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-4">
                    <TrendingUp className="w-5 h-5 text-success" />
                    <h3 className="font-heading font-semibold text-foreground">Inflows</h3>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opening Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.opening_balance || ""}
                        onChange={(e) => handleInputChange("opening_balance", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                      <span>Total Sales</span>
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Auto-calculated</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.total_sales || ""}
                        onChange={(e) => handleInputChange("total_sales", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-success font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                      <span>Additional Cash In</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.cash_in || ""}
                        onChange={(e) => handleInputChange("cash_in", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="e.g. Adding float"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Expenses & Outflows */}
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-4">
                    <TrendingDown className="w-5 h-5 text-destructive" />
                    <h3 className="font-heading font-semibold text-foreground">Outflows (Expenses)</h3>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bakery Expenses</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.bakery_expense || ""}
                        onChange={(e) => handleInputChange("bakery_expense", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-destructive font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Flour, Sugar, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utility Expenses</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.utility_expense || ""}
                        onChange={(e) => handleInputChange("utility_expense", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-destructive font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Gas, Electricity, Water"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.other_expense || ""}
                          onChange={(e) => handleInputChange("other_expense", e.target.value)}
                          className="w-full pl-7 pr-2 py-2 bg-background border border-border rounded-lg text-destructive font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cash Out</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.cash_out || ""}
                          onChange={(e) => handleInputChange("cash_out", e.target.value)}
                          className="w-full pl-7 pr-2 py-2 bg-background border border-border rounded-lg text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Summary & Save */}
              <div className="space-y-4 lg:row-span-2">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Banknote className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Expected Closing Balance</p>
                  <p className={cn(
                    "text-4xl font-heading font-bold mt-2",
                    getClosingBalance() < 0 ? "text-destructive" : "text-primary"
                  )}>
                    {formatCurrency(getClosingBalance())}
                  </p>
                  
                  <div className="w-full mt-6 space-y-2 text-sm text-left border-t border-primary/10 pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Inflows:</span>
                      <span className="font-semibold text-success">
                        +{formatCurrency(formData.opening_balance + formData.total_sales + formData.cash_in)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Outflows:</span>
                      <span className="font-semibold text-destructive">
                        -{formatCurrency(formData.bakery_expense + formData.utility_expense + formData.other_expense + formData.cash_out)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tally Notes</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Add any discrepancies or notes..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSaveTally}
                    disabled={isSubmitting || isFetchingDay}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {existingTallyId ? "Update Tally" : "Save Tally"}
                  </button>
                </div>
              </div>

            </div>
          </Tabs.Content>

          {/* TAB 2: HISTORY */}
          <Tabs.Content value="history" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold text-right">Sales</th>
                      <th className="px-6 py-4 font-semibold text-right">Expenses</th>
                      <th className="px-6 py-4 font-semibold text-right">Closing Bal</th>
                      <th className="px-6 py-4 font-semibold">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoadingHistory ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          Loading history...
                        </td>
                      </tr>
                    ) : tallies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          No daily tallies found.
                        </td>
                      </tr>
                    ) : (
                      tallies.map((tally) => {
                        const totalExpenses = Number(tally.bakery_expense) + Number(tally.utility_expense) + Number(tally.other_expense);
                        return (
                          <tr key={tally.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">
                              {formatDate(tally.date).split(',')[0]}
                            </td>
                            <td className="px-6 py-4 text-right text-success font-semibold">
                              {formatCurrency(tally.total_sales)}
                            </td>
                            <td className="px-6 py-4 text-right text-destructive font-medium">
                              {formatCurrency(totalExpenses)}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-primary">
                              {formatCurrency(tally.closing_balance)}
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {/* @ts-ignore */}
                              {tally.user?.full_name || "Unknown"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

      </div>
    </ProtectedRoute>
  );
}
