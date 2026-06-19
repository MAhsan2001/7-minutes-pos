"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePermission } from "@/hooks/use-permission";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { Promotion, Category, Product } from "@/lib/types";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Percent,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function PromotionsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("promotions", "create");
  const canUpdate = hasPermission("promotions", "update");
  const canDelete = hasPermission("promotions", "delete");

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "discount_percentage",
    target_type: "all",
    target_id: "",
    value: "",
    min_quantity: "1",
    start_time: "",
    end_time: "",
    days_of_week: [] as number[],
    combo_items: [] as { product_id: string; quantity: number }[],
    is_active: true,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [promotionsRes, categoriesRes, productsRes] = await Promise.all([
        supabase.from("promotions").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").eq("is_active", true),
        supabase.from("products").select("id, name").eq("is_active", true)
      ]);

      if (promotionsRes.error) throw promotionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      setPromotions(promotionsRes.data as Promotion[]);
      setCategories(categoriesRes.data as Category[]);
      setProducts(productsRes.data as Product[]);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast.error("Failed to load promotions");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredPromotions = promotions.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingPromotion(null);
    setFormData({
      name: "",
      type: "discount_percentage",
      target_type: "all",
      target_id: "",
      value: "",
      min_quantity: "1",
      start_time: "",
      end_time: "",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      combo_items: [],
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      name: promo.name,
      type: promo.type,
      target_type: promo.target_type,
      target_id: promo.target_id || "",
      value: promo.value.toString(),
      min_quantity: promo.min_quantity.toString(),
      start_time: promo.start_time ? promo.start_time.substring(0, 5) : "",
      end_time: promo.end_time ? promo.end_time.substring(0, 5) : "",
      days_of_week: promo.days_of_week || [],
      combo_items: promo.combo_items || [],
      is_active: promo.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this promotion?")) return;
    try {
      const { error } = await supabase.from("promotions").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      toast.success("Promotion deactivated");
      fetchData();
    } catch (error) {
      toast.error("Failed to deactivate promotion");
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm("Delete permanently?")) return;
    try {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Promotion deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete promotion");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.value) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.target_type !== "all" && formData.target_type !== "combo" && !formData.target_id) {
      toast.error("Please select a target category or product");
      return;
    }

    if (formData.target_type === "combo" && formData.combo_items.length === 0) {
      toast.error("Please add at least one item to the combo");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        target_type: formData.target_type,
        target_id: formData.target_id ? formData.target_id : null,
        value: Number(formData.value),
        min_quantity: Number(formData.min_quantity || 1),
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
        combo_items: formData.target_type === "combo" ? formData.combo_items : null,
        is_active: formData.is_active,
      };

      if (editingPromotion) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", editingPromotion.id);
        if (error) throw error;
        toast.success("Promotion updated");
      } else {
        const { error } = await supabase.from("promotions").insert([payload]);
        if (error) throw error;
        toast.success("Promotion created");
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save promotion");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (dayValue: number) => {
    setFormData(prev => {
      const exists = prev.days_of_week.includes(dayValue);
      if (exists) {
        return { ...prev, days_of_week: prev.days_of_week.filter(d => d !== dayValue) };
      } else {
        return { ...prev, days_of_week: [...prev.days_of_week, dayValue].sort() };
      }
    });
  };

  const renderTargetInfo = (promo: Promotion) => {
    if (promo.target_type === "all") return <span className="badge-primary">All Items</span>;
    if (promo.target_type === "category") {
      const cat = categories.find(c => c.id === promo.target_id);
      return <span className="badge-warning">Category: {cat?.name || "Unknown"}</span>;
    }
    if (promo.target_type === "combo") {
      return <span className="badge-warning bg-purple-500/10 text-purple-600 border-purple-500/20">Combo Deal</span>;
    }
    if (promo.target_type === "product") {
      const prod = products.find(p => p.id === promo.target_id);
      return <span className="badge-success">Product: {prod?.name || "Unknown"}</span>;
    }
  };

  return (
    <ProtectedRoute resource="promotions" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Percent className="w-6 h-6 text-primary" />
              Promotions & Discounts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage Happy Hours, BOGO offers, and percentage discounts
            </p>
          </div>
          {canCreate && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Create Promotion
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search promotions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Schedule</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    </td>
                  </tr>
                ) : filteredPromotions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Percent className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-foreground font-medium">No promotions found</p>
                    </td>
                  </tr>
                ) : (
                  filteredPromotions.map((promo) => (
                    <tr key={promo.id} className="bg-card hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{promo.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {promo.type === "bogo" ? `Buy ${promo.min_quantity} Get ${promo.value}` : 
                           promo.type === "bundle_fixed_price" ? `Buy ${promo.min_quantity} for Rs. ${promo.value}` :
                           promo.type === "discount_percentage" ? `${promo.value}% Off (Min Qty: ${promo.min_quantity})` : 
                           `Rs. ${promo.value} Off (Min Qty: ${promo.min_quantity})`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium capitalize text-xs">
                          {promo.type.replace("discount_", "")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {renderTargetInfo(promo)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {(promo.start_time || promo.end_time) && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {promo.start_time?.substring(0,5) || "Open"} - {promo.end_time?.substring(0,5) || "Close"}
                            </div>
                          )}
                          {promo.days_of_week && promo.days_of_week.length < 7 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {promo.days_of_week.length} days/wk
                            </div>
                          )}
                          {!promo.start_time && !promo.end_time && (!promo.days_of_week || promo.days_of_week.length === 7) && (
                            <span className="text-success">Always Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {promo.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content align="end" className="min-w-[160px] bg-card rounded-xl border border-border shadow-lg p-1 z-50">
                              {canUpdate && (
                                <DropdownMenu.Item onClick={() => handleOpenEdit(promo)} className="flex items-center gap-2 px-2 py-2 text-sm cursor-pointer outline-none hover:bg-muted rounded-lg">
                                  <Edit className="w-4 h-4" /> Edit
                                </DropdownMenu.Item>
                              )}
                              {canDelete && promo.is_active && (
                                <DropdownMenu.Item onClick={() => handleDelete(promo.id)} className="flex items-center gap-2 px-2 py-2 text-sm text-warning cursor-pointer outline-none hover:bg-warning/10 rounded-lg">
                                  <XCircle className="w-4 h-4" /> Deactivate
                                </DropdownMenu.Item>
                              )}
                              {canDelete && (
                                <DropdownMenu.Item onClick={() => handleHardDelete(promo.id)} className="flex items-center gap-2 px-2 py-2 text-sm text-destructive cursor-pointer outline-none hover:bg-destructive/10 rounded-lg">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenu.Item>
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dialog Modal */}
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl z-50 p-6">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground">
                  {editingPromotion ? "Edit Promotion" : "Create Promotion"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Promotion Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder="e.g. Weekend Happy Hour"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Promotion Type *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    >
                      <option value="discount_percentage">Percentage Discount (%)</option>
                      <option value="discount_fixed">Fixed Amount Discount (Rs.)</option>
                      <option value="bogo">Buy X Get Y (BOGO)</option>
                      <option value="bundle_fixed_price">Bundle Pricing (Buy X for Rs. Y)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Type *</label>
                    <select
                      required
                      value={formData.target_type}
                      onChange={(e) => setFormData({ ...formData, target_type: e.target.value, target_id: "" })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    >
                      <option value="all">All Items</option>
                      <option value="category">Specific Category</option>
                      <option value="product">Specific Product</option>
                      <option value="combo">Combo Deal (Multiple Products)</option>
                    </select>
                  </div>
                  {formData.target_type !== "all" && formData.target_type !== "combo" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <label className="text-sm font-medium">Select {formData.target_type} *</label>
                      <select
                        required
                        value={formData.target_id}
                        onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      >
                        <option value="">Select...</option>
                        {formData.target_type === "category" 
                          ? categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                          : products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                        }
                      </select>
                    </div>
                  )}
                </div>

                {formData.target_type === "combo" && (
                  <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-purple-600">Combo Recipe *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, combo_items: [...formData.combo_items, { product_id: "", quantity: 1 }] });
                        }}
                        className="text-xs font-medium text-purple-600 bg-purple-500/10 px-2 py-1 rounded hover:bg-purple-500/20"
                      >
                        + Add Item
                      </button>
                    </div>
                    {formData.combo_items.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Click + Add Item to build your combo.</p>
                    )}
                    {formData.combo_items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => {
                            const newItems = [...formData.combo_items];
                            newItems[idx].product_id = e.target.value;
                            setFormData({ ...formData, combo_items: newItems });
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        >
                          <option value="">Select product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.combo_items];
                            newItems[idx].quantity = Number(e.target.value);
                            setFormData({ ...formData, combo_items: newItems });
                          }}
                          className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-sm text-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = formData.combo_items.filter((_, i) => i !== idx);
                            setFormData({ ...formData, combo_items: newItems });
                          }}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {formData.target_type === "combo" ? "Bundle Pricing Amount (Rs. Y)" : formData.type === "bogo" ? "Free Items Given (Y)" : formData.type === "bundle_fixed_price" ? "Bundle Price (Rs. Y)" : "Discount Value"} *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step={formData.type === "discount_percentage" && formData.target_type !== "combo" ? "1" : "0.01"}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder={formData.type === "discount_percentage" ? "e.g. 20" : formData.type === "bogo" ? "e.g. 1" : formData.type === "bundle_fixed_price" ? "e.g. 1990" : "e.g. 100"}
                    />
                  </div>
                  {formData.target_type !== "combo" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {formData.type === "bogo" ? "Min Quantity to Buy (X)" : formData.type === "bundle_fixed_price" ? "Bundle Quantity (X)" : "Minimum Quantity Required"} *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    />
                  </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Time Schedule (Optional)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Start Time</label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">End Time</label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <label className="text-xs text-muted-foreground">Active Days</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-full border transition-colors focus:outline-none",
                            formData.days_of_week.includes(day.value)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          )}
                        >
                          {day.label.substring(0,3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 pb-4 border-b border-border">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                    Promotion is active
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 text-sm font-medium bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {editingPromotion ? "Update Promotion" : "Create Promotion"}
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
