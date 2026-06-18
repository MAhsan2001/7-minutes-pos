"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { hasPermission } from "@/lib/utils/rbac";
import type { Supplier, Purchase, Product } from "@/lib/types";
import {
  Search,
  Truck,
  FileText,
  Plus,
  Loader2,
  X,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Trash2,
  PackageSearch
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  // Purchase Order Form
  const [poForm, setPoForm] = useState({
    supplier_id: "",
    notes: "",
  });
  
  const [poItems, setPoItems] = useState<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[]>([]);
  const [poSelectedItem, setPoSelectedItem] = useState("");
  const [poSelectedQty, setPoSelectedQty] = useState("");
  const [poSelectedPrice, setPoSelectedPrice] = useState("");

  const { profile } = useAuthStore();
  const supabase = createClient();
  const canUpdateSuppliers = hasPermission(profile?.role, "suppliers", "update");

  useEffect(() => {
    fetchData();
    if (activeTab === "purchases" && products.length === 0) {
      fetchProducts();
    }
  }, [activeTab]);

  async function fetchData() {
    setIsLoading(true);
    try {
      if (activeTab === "suppliers") {
        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .order("name");
        if (error) throw error;
        setSuppliers(data as Supplier[]);
      } else {
        const { data, error } = await supabase
          .from("purchases")
          .select("*, supplier:suppliers(name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setPurchases(data as Purchase[]);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setProducts(data as Product[]);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("suppliers").insert([
        {
          name: supplierForm.name,
          contact_person: supplierForm.contact_person || null,
          phone: supplierForm.phone || null,
          email: supplierForm.email || null,
          address: supplierForm.address || null,
        },
      ]);
      if (error) throw error;

      toast.success("Supplier added successfully");
      setIsSupplierModalOpen(false);
      setSupplierForm({ name: "", contact_person: "", phone: "", email: "", address: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error saving supplier:", error);
      toast.error(error.message || "Failed to add supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPoItem = () => {
    if (!poSelectedItem || !poSelectedQty || !poSelectedPrice) return;
    const product = products.find(p => p.id === poSelectedItem);
    if (!product) return;

    setPoItems([
      ...poItems,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: parseInt(poSelectedQty),
        unit_price: parseFloat(poSelectedPrice),
      }
    ]);

    setPoSelectedItem("");
    setPoSelectedQty("");
    setPoSelectedPrice("");
  };

  const handleRemovePoItem = (index: number) => {
    const newItems = [...poItems];
    newItems.splice(index, 1);
    setPoItems(newItems);
  };

  const poTotal = poItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      toast.error("Please add at least one item to the purchase order");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const purchaseNumber = `PO-${Date.now().toString().slice(-6)}`;
      
      const payload = {
        p_supplier_id: poForm.supplier_id,
        p_purchase_number: purchaseNumber,
        p_total_amount: poTotal,
        p_notes: poForm.notes || null,
        p_items: poItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.quantity * i.unit_price,
        })),
      };

      const { error } = await supabase.rpc("complete_purchase", payload);
      if (error) throw error;

      toast.success("Purchase Order recorded and stock updated!");
      setIsPurchaseModalOpen(false);
      setPoForm({ supplier_id: "", notes: "" });
      setPoItems([]);
      fetchData();
    } catch (error: any) {
      console.error("Error saving purchase:", error);
      toast.error(error.message || "Failed to record purchase. Ensure RPC migration 003 is run.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ProtectedRoute resource="products" action="read">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Suppliers & Purchases</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage vendors and log incoming stock orders.
            </p>
          </div>
          {canUpdateSuppliers && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsSupplierModalOpen(true)}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-xl font-medium hover:bg-secondary/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-sm"
              >
                <FileText className="w-4 h-4" />
                New Purchase Order
              </button>
            </div>
          )}
        </div>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="flex border-b border-border w-full mb-6">
            <Tabs.Trigger
              value="suppliers"
              className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Suppliers Directory
            </Tabs.Trigger>
            <Tabs.Trigger
              value="purchases"
              className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Purchase Orders
            </Tabs.Trigger>
          </Tabs.List>

          {/* TAB 1: SUPPLIERS */}
          <Tabs.Content value="suppliers" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-border border-dashed rounded-xl bg-card">
                <Truck className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-lg font-semibold text-foreground">No suppliers found</p>
                <p className="text-muted-foreground">Add your first supplier to start tracking purchases.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-heading font-bold text-lg text-foreground mb-1">{supplier.name}</h3>
                    {supplier.contact_person && (
                      <p className="text-sm font-medium text-primary mb-3">{supplier.contact_person}</p>
                    )}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {supplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" /> <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" /> <span>{supplier.email}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0" /> <span className="line-clamp-2">{supplier.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          {/* TAB 2: PURCHASES */}
          <Tabs.Content value="purchases" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-sm text-muted-foreground border-b border-border">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">PO Number</th>
                      <th className="px-6 py-3 font-medium">Supplier</th>
                      <th className="px-6 py-3 font-medium">Total Amount</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          Loading purchases...
                        </td>
                      </tr>
                    ) : purchases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          No purchase orders recorded yet.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {formatDate(purchase.created_at)}
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">
                            {purchase.purchase_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {/* @ts-ignore */}
                            {purchase.supplier?.name || "Unknown"}
                          </td>
                          <td className="px-6 py-4 font-bold text-foreground">
                            {formatCurrency(purchase.total_amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success capitalize">
                              {purchase.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

        {/* Add Supplier Modal */}
        <Dialog.Root open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground">
                  Add Supplier
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Company Name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    required
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Phone</label>
                    <input
                      type="text"
                      value={supplierForm.phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <textarea
                    rows={2}
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting || !supplierForm.name}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* New Purchase Order Modal */}
        <Dialog.Root open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground">
                  New Purchase Order (Goods Receipt)
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
                {/* Left Side: Form */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4 p-4 bg-muted/20 border border-border rounded-xl">
                    <h3 className="font-semibold text-sm text-foreground">PO Details</h3>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Supplier <span className="text-destructive">*</span></label>
                      <select
                        required
                        value={poForm.supplier_id}
                        onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">Select a supplier...</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
                      <input
                        type="text"
                        value={poForm.notes}
                        onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Invoice # or reference..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <h3 className="font-semibold text-sm text-foreground">Add Item</h3>
                    <div className="space-y-3">
                      <select
                        value={poSelectedItem}
                        onChange={(e) => {
                          setPoSelectedItem(e.target.value);
                          const p = products.find(x => x.id === e.target.value);
                          if(p) setPoSelectedPrice(p.cost_price.toString());
                        }}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">Select product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Cost: {p.cost_price})</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={poSelectedQty}
                          onChange={(e) => setPoSelectedQty(e.target.value)}
                          className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit Cost (Rs.)"
                          value={poSelectedPrice}
                          onChange={(e) => setPoSelectedPrice(e.target.value)}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={handleAddPoItem}
                          disabled={!poSelectedItem || !poSelectedQty || !poSelectedPrice}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Items Cart */}
                <div className="flex-1 flex flex-col bg-muted/10 border border-border rounded-xl overflow-hidden">
                  <div className="p-3 bg-muted/50 border-b border-border font-semibold text-sm text-foreground">
                    Purchase Order Items
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {poItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No items added yet.</p>
                    ) : (
                      poItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-background border border-border rounded-lg shadow-sm">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-sm text-foreground">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </span>
                            <button
                              onClick={() => handleRemovePoItem(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-4 border-t border-border bg-background flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total:</span>
                    <span className="font-bold text-xl text-primary">{formatCurrency(poTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/10 shrink-0">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleSavePurchase}
                  disabled={isSubmitting || !poForm.supplier_id || poItems.length === 0}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Complete Purchase (Receive Stock)
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
    </ProtectedRoute>
  );
}
