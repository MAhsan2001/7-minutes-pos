"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePermission } from "@/hooks/use-permission";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_UNITS } from "@/lib/utils/constants";
import type { Product, Category } from "@/lib/types";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  Loader2,
  X,
  CheckCircle2,
  XCircle
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("products", "create");
  const canUpdate = hasPermission("products", "update");
  const canDelete = hasPermission("products", "delete");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    price: "",
    cost_price: "",
    unit: "piece",
    stock_quantity: "",
    low_stock_threshold: "10",
    is_active: true,
  });
  const [variants, setVariants] = useState<{ id?: string; name: string; price: string; is_active: boolean }[]>([]);
  const [addons, setAddons] = useState<{ id?: string; name: string; price: string; is_active: boolean }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, category:categories(name), variants:product_variants(*), addons:product_addons(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts(productsRes.data as unknown as Product[]);
      setCategories(categoriesRes.data as Category[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      category_id: categories.length > 0 ? categories[0].id : "",
      price: "",
      cost_price: "",
      unit: "piece",
      stock_quantity: "0",
      low_stock_threshold: "10",
      is_active: true,
    });
    setVariants([]);
    setAddons([]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id,
      price: product.price.toString(),
      cost_price: product.cost_price.toString(),
      unit: product.unit,
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
      is_active: product.is_active,
    });
    setVariants((product.variants || []).map(v => ({ id: v.id, name: v.name, price: v.price.toString(), is_active: v.is_active })));
    setAddons((product.addons || []).map(a => ({ id: a.id, name: a.name, price: a.price.toString(), is_active: a.is_active })));
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Product deactivated successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to deactivate product");
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this product? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.code === '23503') { // Postgres foreign key violation code
          toast.error("Cannot delete product because it has been sold before. Please Deactivate it instead.", { duration: 5000 });
        } else {
          throw error;
        }
        return;
      }
      
      toast.success("Product completely deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleAddVariant = () => {
    setVariants([...variants, { name: "", price: "", is_active: true }]);
  };

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleRemoveVariant = (index: number) => {
    const newVariants = [...variants];
    if (newVariants[index].id) {
      newVariants[index].is_active = false;
    } else {
      newVariants.splice(index, 1);
    }
    setVariants(newVariants);
  };

  const handleAddAddon = () => {
    setAddons([...addons, { name: "", price: "", is_active: true }]);
  };

  const handleUpdateAddon = (index: number, field: string, value: any) => {
    const newAddons = [...addons];
    newAddons[index] = { ...newAddons[index], [field]: value };
    setAddons(newAddons);
  };

  const handleRemoveAddon = (index: number) => {
    const newAddons = [...addons];
    if (newAddons[index].id) {
      newAddons[index].is_active = false;
    } else {
      newAddons.splice(index, 1);
    }
    setAddons(newAddons);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        sku: formData.sku || `SKU-${Math.floor(Math.random() * 10000)}`,
        category_id: formData.category_id,
        price: Number(formData.price),
        cost_price: Number(formData.cost_price || 0),
        unit: formData.unit,
        stock_quantity: Number(formData.stock_quantity || 0),
        low_stock_threshold: Number(formData.low_stock_threshold || 0),
        is_active: formData.is_active,
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert([payload]).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Handle Variants
      if (productId) {
        const variantsToUpsert = variants.map(v => ({
          ...(v.id ? { id: v.id } : {}),
          product_id: productId,
          name: v.name,
          price: Number(v.price),
          is_active: v.is_active
        }));
        
        const variantsToUpdate = variantsToUpsert.filter(v => v.id);
        const variantsToInsert = variantsToUpsert.filter(v => !v.id);

        if (variantsToInsert.length > 0) {
          const { error: insertErr } = await supabase.from("product_variants").insert(variantsToInsert);
          if (insertErr) throw insertErr;
        }
        for (const v of variantsToUpdate) {
          await supabase.from("product_variants").update({ name: v.name, price: v.price, is_active: v.is_active }).eq("id", v.id);
        }

        // Handle Addons
        const addonsToUpsert = addons.map(a => ({
          ...(a.id ? { id: a.id } : {}),
          product_id: productId,
          name: a.name,
          price: Number(a.price),
          is_active: a.is_active
        }));
        
        const addonsToUpdate = addonsToUpsert.filter(a => a.id);
        const addonsToInsert = addonsToUpsert.filter(a => !a.id);

        if (addonsToInsert.length > 0) {
          const { error: insertErr } = await supabase.from("product_addons").insert(addonsToInsert);
          if (insertErr) throw insertErr;
        }
        for (const a of addonsToUpdate) {
          await supabase.from("product_addons").update({ name: a.name, price: a.price, is_active: a.is_active }).eq("id", a.id);
        }
      }

      toast.success(editingProduct ? "Product updated successfully" : "Product added successfully");

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute resource="products" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Products
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your bakery products and pricing
            </p>
          </div>
          {canCreate && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium text-right">Price</th>
                  <th className="px-6 py-4 font-medium text-right">Stock</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading products...</p>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-foreground font-medium">No products found</p>
                      <p className="text-muted-foreground mt-1">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="bg-card hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {product.name}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {product.variants?.some(v => v.is_active) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">Variants</span>
                          )}
                          {product.addons?.some(a => a.is_active) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-success/10 text-success border border-success/20">Add-ons</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                          {product.category?.name || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={cn(
                              "font-medium",
                              product.stock_quantity <= product.low_stock_threshold
                                ? "text-destructive"
                                : "text-foreground"
                            )}
                          >
                            {product.stock_quantity} {product.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.is_active ? (
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
                            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors focus:outline-none">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              align="end"
                              className="min-w-[160px] bg-card rounded-xl border border-border shadow-lg p-1 animate-in fade-in zoom-in-95 z-50"
                            >
                              {canUpdate && (
                                <DropdownMenu.Item
                                  onClick={() => handleOpenEdit(product)}
                                  className="flex items-center gap-2 px-2 py-2 text-sm text-foreground hover:bg-muted rounded-lg cursor-pointer outline-none"
                                >
                                  <Edit className="w-4 h-4 text-muted-foreground" />
                                  Edit
                                </DropdownMenu.Item>
                              )}
                              {canDelete && product.is_active && (
                                <DropdownMenu.Item
                                  onClick={() => handleDelete(product.id)}
                                  className="flex items-center gap-2 px-2 py-2 text-sm text-warning hover:bg-warning/10 rounded-lg cursor-pointer outline-none"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Deactivate
                                </DropdownMenu.Item>
                              )}
                              {canDelete && (
                                <DropdownMenu.Item
                                  onClick={() => handleHardDelete(product.id)}
                                  className="flex items-center gap-2 px-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer outline-none"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
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
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 p-6">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">SKU (Auto-generated if empty)</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
                      placeholder="e.g. BUN-001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Category *</label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="" disabled>Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {PRODUCT_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Selling Price (Rs.) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Cost Price (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Initial Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Low Stock Alert Level</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Variants Section */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Product Variants (Optional)</h3>
                      <p className="text-xs text-muted-foreground">E.g., Small, Medium, Large, Spicy</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="text-xs flex items-center gap-1 text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Variant
                    </button>
                  </div>
                  {variants.map((variant, index) => variant.is_active && (
                    <div key={index} className="flex gap-2 items-start animate-in fade-in zoom-in-95">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          placeholder="Variant Name"
                          value={variant.name}
                          onChange={(e) => handleUpdateVariant(index, "name", e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={variant.price}
                          onChange={(e) => handleUpdateVariant(index, "price", e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="mt-1 p-1.5 text-destructive bg-destructive/10 hover:bg-destructive hover:text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add-ons Section */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Add-ons (Optional)</h3>
                      <p className="text-xs text-muted-foreground">E.g., Extra Cheese, Extra Mayo</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAddon}
                      className="text-xs flex items-center gap-1 text-success bg-success/10 hover:bg-success/20 px-2 py-1 rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Add-on
                    </button>
                  </div>
                  {addons.map((addon, index) => addon.is_active && (
                    <div key={index} className="flex gap-2 items-start animate-in fade-in zoom-in-95">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          placeholder="Add-on Name"
                          value={addon.name}
                          onChange={(e) => handleUpdateAddon(index, "name", e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={addon.price}
                          onChange={(e) => handleUpdateAddon(index, "price", e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(index)}
                        className="mt-1 p-1.5 text-destructive bg-destructive/10 hover:bg-destructive hover:text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
                    Product is active and visible in POS
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-muted-foreground"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {editingProduct ? "Update Product" : "Add Product"}
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
