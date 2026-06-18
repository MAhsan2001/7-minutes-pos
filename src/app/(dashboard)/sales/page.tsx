"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Sale, SaleItem } from "@/lib/types";
import { hasPermission } from "@/lib/utils/rbac";
import { SALE_STATUS_CONFIG, APP_NAME } from "@/lib/utils/constants";
import { Receipt as ThermalReceipt } from "@/components/pos/Receipt";
import {
  Search,
  Receipt,
  FileText,
  Loader2,
  X,
  Printer,
  ChevronRight,
  Ban,
  CornerUpLeft,
  AlertTriangle
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

type DetailedSale = Sale & {
  cashier?: { full_name: string };
  sale_items: SaleItem[];
};

export default function SalesPage() {
  const [sales, setSales] = useState<DetailedSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("all");

  // Modal State
  const [selectedSale, setSelectedSale] = useState<DetailedSale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Void/Refund State
  const [isActionMode, setIsActionMode] = useState<"void" | "refund" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings State for Reprinting
  const [bakeryProfile, setBakeryProfile] = useState({
    name: APP_NAME.toUpperCase(),
    address: "Mount Lavinia, Sri Lanka",
    phone: "011-XXXXXXX"
  });
  const [receiptSettings, setReceiptSettings] = useState({
    header: "",
    footer: "Thank you! Come again!",
    width: "58mm",
    logo: "",
    showLogo: true,
    fontFamily: "'Arial', sans-serif",
    fontSize: "text-sm"
  });

  // Hidden receipt for reprint
  const receiptRef = useRef<HTMLDivElement>(null);

  const { profile } = useAuthStore();
  const supabase = createClient();
  const canVoidSales = profile ? hasPermission(profile.role, "sales", "delete") : false;

  const fetchSalesAndSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch Settings First
      const { data: settingsData } = await supabase.from("settings").select("*");
      if (settingsData) {
        const profileSetting = settingsData.find(s => s.key === "bakery_profile")?.value;
        const receiptSetting = settingsData.find(s => s.key === "receipt_settings")?.value;
        
        if (profileSetting) {
          const profile = profileSetting as any;
          setBakeryProfile({
            name: profile.bakery_name || APP_NAME.toUpperCase(),
            address: profile.address || "Mount Lavinia, Sri Lanka",
            phone: profile.phone || "011-XXXXXXX"
          });
        }
        if (receiptSetting) {
          const receipt = receiptSetting as any;
          setReceiptSettings({
            header: receipt.header || "",
            footer: receipt.footer || "Thank you! Come again!",
            width: receipt.receipt_width || "58mm",
            logo: receipt.logo,
            showLogo: receipt.show_logo !== undefined ? receipt.show_logo : true,
            fontFamily: receipt.font_family || "'Arial', sans-serif",
            fontSize: receipt.font_size || "text-sm"
          });
        }
      }

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          cashier:profiles(full_name),
          sale_items(*)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setSales(data as DetailedSale[]);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to load sales");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesAndSettings();
  }, []);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !isActionMode || !actionReason.trim()) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("void_sale", {
        p_sale_id: selectedSale.id,
        p_status: isActionMode === "void" ? "void" : "refunded",
        p_reason: actionReason,
      });

      if (error) throw error;

      toast.success(`Sale ${isActionMode === "void" ? "voided" : "refunded"} successfully.`);
      setIsModalOpen(false);
      setIsActionMode(null);
      setActionReason("");
      fetchSalesAndSettings(); // Refresh the list
    } catch (error: any) {
      console.error("Error processing action:", error);
      toast.error(error.message || "Failed to process the request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const uniqueCashiers = Array.from(
    new Set(sales.map((s) => s.shift_cashier_name || s.cashier?.full_name || "Unknown"))
  ).sort();

  const filteredSales = sales.filter((s) => {
    const cashierName = s.shift_cashier_name || s.cashier?.full_name || "Unknown";
    const matchesSearch = s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCashier = selectedCashier === "all" || cashierName === selectedCashier;
    return matchesSearch && matchesCashier;
  });

  return (
    <ProtectedRoute resource="sales" action="read">
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Sales History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View past transactions, reprint receipts, and process refunds.
            </p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Invoice Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          
          <div className="w-full sm:w-64">
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
            >
              <option value="all">All Cashiers</option>
              {uniqueCashiers.map((cashier) => (
                <option key={cashier} value={cashier}>
                  {cashier}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-sm text-muted-foreground border-b border-border">
                  <th className="px-6 py-3 font-medium">Date & Time</th>
                  <th className="px-6 py-3 font-medium">Invoice #</th>
                  <th className="px-6 py-3 font-medium">Cashier</th>
                  <th className="px-6 py-3 font-medium">Payment</th>
                  <th className="px-6 py-3 font-medium text-right">Total</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading sales history...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No sales found.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const statusConfig = SALE_STATUS_CONFIG[sale.status as keyof typeof SALE_STATUS_CONFIG] || { label: sale.status, color: "bg-muted" };
                    return (
                      <tr 
                        key={sale.id} 
                        className={cn(
                          "hover:bg-muted/30 transition-colors cursor-pointer group",
                          sale.status !== "completed" && "opacity-75 bg-muted/10"
                        )}
                        onClick={() => {
                          setSelectedSale(sale);
                          setIsActionMode(null);
                          setIsModalOpen(true);
                        }}
                      >
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
                          {formatDate(sale.created_at)}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {sale.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {sale.shift_cashier_name ? (
                            <span className="font-semibold text-foreground">{sale.shift_cashier_name}</span>
                          ) : (
                            sale.cashier?.full_name || "Unknown"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {sale.payment_method}
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground text-right">
                          {formatCurrency(sale.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusConfig.color)}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors group-hover:bg-primary/5">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sale Details Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={(open) => {
          if (!open) setIsActionMode(null);
          setIsModalOpen(open);
        }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
              
              <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/10">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {selectedSale?.invoice_number}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="flex-1 overflow-y-auto p-6 relative">
                {isActionMode ? (
                  <form onSubmit={handleActionSubmit} className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="p-4 rounded-xl border border-warning/20 bg-warning/10 text-warning mb-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold">Are you sure you want to {isActionMode} this sale?</h4>
                          <p className="text-sm mt-1">
                            This action will automatically return all items to inventory stock. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Reason for {isActionMode} <span className="text-destructive">*</span></label>
                      <textarea
                        required
                        rows={3}
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder="e.g. Customer returned items, Cashier error, etc."
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsActionMode(null)}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessing || !actionReason.trim()}
                        className={cn(
                          "flex items-center gap-2 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50",
                          isActionMode === "void" ? "bg-destructive hover:bg-destructive/90" : "bg-warning hover:bg-warning/90"
                        )}
                      >
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm {isActionMode}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-left-4">
                    {/* Status Banner */}
                    {selectedSale?.status !== "completed" && (
                      <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium text-center capitalize">
                        This invoice is {selectedSale?.status}
                      </div>
                    )}

                    {/* Items List */}
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Items Purchased</h4>
                      <div className="space-y-3">
                        {selectedSale?.sale_items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                            <div>
                              <p className="font-semibold text-sm text-foreground">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                            </div>
                            <span className="font-bold text-sm text-foreground">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/20 p-4 rounded-xl space-y-2 border border-border">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Payment Method</span>
                        <span className="capitalize font-medium">{selectedSale?.payment_method}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Amount Paid</span>
                        <span className="font-medium text-foreground">{formatCurrency(selectedSale?.paid_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Change Given</span>
                        <span className="font-medium text-foreground">{formatCurrency(selectedSale?.change_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border/50">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(selectedSale?.total_amount || 0)}</span>
                      </div>
                    </div>

                    {/* Notes (if any) */}
                    {selectedSale?.notes && (
                      <div className="text-sm bg-background border border-border p-3 rounded-lg text-muted-foreground">
                        <span className="font-semibold text-foreground">Notes:</span>
                        <p className="mt-1 whitespace-pre-wrap">{selectedSale.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              {!isActionMode && (
                <div className="p-4 border-t border-border bg-muted/10 shrink-0 flex flex-wrap gap-3 justify-between items-center">
                  <div className="flex gap-2">
                    {canVoidSales && selectedSale?.status === "completed" && (
                      <>
                        <button
                          onClick={() => setIsActionMode("refund")}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-background text-warning border border-border rounded-lg hover:bg-warning/10 transition-colors shadow-sm"
                        >
                          <CornerUpLeft className="w-4 h-4" />
                          Refund
                        </button>
                        <button
                          onClick={() => setIsActionMode("void")}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-background text-destructive border border-border rounded-lg hover:bg-destructive/10 transition-colors shadow-sm"
                        >
                          <Ban className="w-4 h-4" />
                          Void
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors shadow-sm ml-auto"
                  >
                    <Printer className="w-4 h-4" />
                    Reprint Receipt
                  </button>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Hidden Thermal Receipt for Reprinting */}
        {selectedSale && (
          <ThermalReceipt
            ref={receiptRef}
            invoiceNumber={selectedSale.invoice_number}
            items={selectedSale.sale_items.map(i => ({
              product_id: i.product_id,
              product_name: i.product_name,
              quantity: i.quantity,
              unit_price: i.unit_price,
              image_url: undefined,
            }))}
            totalAmount={selectedSale.total_amount}
            paidAmount={selectedSale.paid_amount}
            changeAmount={selectedSale.change_amount || 0}
            paymentMethod={selectedSale.payment_method}
            date={new Date(selectedSale.created_at)}
            cashierName={selectedSale.cashier?.full_name}
            headerMessage={selectedSale.status !== "completed" ? `*** ${selectedSale.status.toUpperCase()} ***\n${receiptSettings.header}` : receiptSettings.header}
            bakeryName={bakeryProfile.name}
            address={bakeryProfile.address}
            phone={bakeryProfile.phone}
            footerMessage={receiptSettings.footer}
            logo={receiptSettings.logo}
            showLogo={receiptSettings.showLogo}
            fontFamily={receiptSettings.fontFamily}
            fontSize={receiptSettings.fontSize}
            width={receiptSettings.width as any}
          />
        )}

      </div>
    </ProtectedRoute>
  );
}
