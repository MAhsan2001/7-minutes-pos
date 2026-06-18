"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import { STOCK_MOVEMENT_TYPES } from "@/lib/utils/constants";
import { hasPermission } from "@/lib/utils/rbac";
import type { Product, StockMovement } from "@/lib/types";
import {
  Search,
  Warehouse,
  History,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Loader2,
  X,
  CheckCircle2,
  PackageSearch
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";

export default function StockPage() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    product_id: "",
    type: "adjustment",
    quantity: "",
    notes: "",
  });

  const { profile } = useAuthStore();
  const supabase = createClient();
  const canUpdateStock = hasPermission(profile?.role, "stock", "update");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setIsLoading(true);
    try {
      if (activeTab === "inventory") {
        const { data, error } = await supabase
          .from("products")
          .select("*, category:categories(name)")
          .order("name");

        if (error) throw error;
        setProducts(data as Product[]);
      } else {
        const { data, error } = await supabase
          .from("stock_movements")
          .select("*, product:products(name), user:profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setMovements(data as StockMovement[]);
      }
    } catch (error: any) {
      console.error("Error fetching stock data:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = showLowStockOnly
      ? (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)
      : true;
    return matchesSearch && matchesLowStock;
  });

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty === 0) {
      toast.error("Please enter a valid non-zero quantity");
      return;
    }

    // Force negative quantity for wastage and damage if user entered positive
    let finalQty = qty;
    if ((formData.type === "wastage" || formData.type === "damage") && finalQty > 0) {
      finalQty = -finalQty;
    }
    // Force positive quantity for returns
    if (formData.type === "return" && finalQty < 0) {
      finalQty = Math.abs(finalQty);
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("stock_movements").insert([
        {
          product_id: formData.product_id,
          type: formData.type,
          quantity: finalQty,
          notes: formData.notes || null,
          created_by: profile.id,
        },
      ]);

      if (error) throw error;

      toast.success("Stock movement recorded successfully");
      setIsModalOpen(false);
      setFormData({ product_id: "", type: "adjustment", quantity: "", notes: "" });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error("Error recording movement:", error);
      toast.error(error.message || "Failed to record movement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMovementColor = (type: string) => {
    const config = STOCK_MOVEMENT_TYPES.find((t) => t.value === type);
    return config?.color || "text-muted-foreground";
  };

  const getMovementLabel = (type: string) => {
    const config = STOCK_MOVEMENT_TYPES.find((t) => t.value === type);
    return config?.label || type;
  };

  return (
    <ProtectedRoute resource="products" action="read">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Stock Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track inventory levels and record manual stock adjustments.
            </p>
          </div>
          {canUpdateStock && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Record Movement
            </button>
          )}
        </div>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="flex border-b border-border w-full mb-6">
            <Tabs.Trigger
              value="inventory"
              className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
            >
              <Warehouse className="w-4 h-4" />
              Current Stock
            </Tabs.Trigger>
            <Tabs.Trigger
              value="history"
              className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Movement History
            </Tabs.Trigger>
          </Tabs.List>

          {/* TAB 1: CURRENT INVENTORY */}
          <Tabs.Content value="inventory" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className={showLowStockOnly ? "text-destructive font-semibold" : ""}>
                  Show Low Stock Only
                </span>
              </label>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-sm text-muted-foreground border-b border-border">
                      <th className="px-6 py-3 font-medium">Product</th>
                      <th className="px-6 py-3 font-medium">SKU</th>
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 font-medium text-right">In Stock</th>
                      <th className="px-6 py-3 font-medium text-right">Threshold</th>
                      <th className="px-6 py-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          Loading inventory...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          <PackageSearch className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          No products found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const isLow = (product.stock_quantity || 0) <= (product.low_stock_threshold || 10);
                        const isOut = (product.stock_quantity || 0) <= 0;
                        return (
                          <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-medium text-foreground">{product.name}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{product.sku}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {/* @ts-ignore */}
                              {product.category?.name || "Uncategorized"}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-foreground">
                              {product.stock_quantity}
                              <span className="text-xs font-normal text-muted-foreground ml-1">{product.unit}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                              {product.low_stock_threshold}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isOut ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                                  In Stock
                                </span>
                              )}
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

          {/* TAB 2: MOVEMENT HISTORY */}
          <Tabs.Content value="history" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-sm text-muted-foreground border-b border-border">
                      <th className="px-6 py-3 font-medium">Date & Time</th>
                      <th className="px-6 py-3 font-medium">Product</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium text-right">Qty Change</th>
                      <th className="px-6 py-3 font-medium">Recorded By</th>
                      <th className="px-6 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          Loading history...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          No stock movements found.
                        </td>
                      </tr>
                    ) : (
                      movements.map((mov) => {
                        const isPositive = mov.quantity > 0;
                        return (
                          <tr key={mov.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
                              {formatDate(mov.created_at)}
                            </td>
                            <td className="px-6 py-4 font-medium text-foreground">
                              {/* @ts-ignore */}
                              {mov.product?.name || "Unknown Product"}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn("text-sm font-semibold capitalize", getMovementColor(mov.type))}>
                                {getMovementLabel(mov.type)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={cn(
                                  "font-bold text-sm px-2.5 py-0.5 rounded-full",
                                  isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                )}
                              >
                                {isPositive ? "+" : ""}
                                {mov.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {/* @ts-ignore */}
                              {mov.user?.full_name || "System"}
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate" title={mov.notes || ""}>
                              {mov.notes || "-"}
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

        {/* Record Movement Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground">
                  Record Stock Movement
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleRecordMovement} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Product <span className="text-destructive">*</span></label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select a product...</option>
                    {products.filter(p => p.is_active).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Current: {p.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Movement Type <span className="text-destructive">*</span></label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary capitalize"
                  >
                    <option value="adjustment">Adjustment (Manual Count Update)</option>
                    <option value="wastage">Wastage (Expired/Spoiled)</option>
                    <option value="damage">Damage (Dropped/Broken)</option>
                    <option value="return">Return (From Customer)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Note: "Purchase" and "Sale" movements are recorded automatically via their respective modules.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Quantity <span className="text-destructive">*</span></label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder={
                      formData.type === "wastage" || formData.type === "damage"
                        ? "E.g. 5 (will be deducted)"
                        : "E.g. 10 or -5"
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {formData.type === "adjustment" && (
                    <p className="text-xs text-muted-foreground">
                      Use negative numbers to deduct, positive to add.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Reason for movement..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.product_id || !formData.quantity}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Record
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
    </ProtectedRoute>
  );
}
