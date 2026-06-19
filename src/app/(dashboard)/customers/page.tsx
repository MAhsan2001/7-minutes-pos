"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePermission } from "@/hooks/use-permission";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import type { Customer } from "@/lib/types";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Users,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Banknote,
  Phone
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { DEFAULT_BAKERY_SETTINGS } from "@/lib/utils/constants";

export default function CustomersPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("customers", "create");
  const canUpdate = hasPermission("customers", "update");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State - Add/Edit Customer
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State - Settle Balance
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleCustomer, setSettleCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [isSettling, setIsSettling] = useState(false);

  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    vat_number: "",
    is_active: true,
  });

  const supabase = createClient();
  const currencySymbol = DEFAULT_BAKERY_SETTINGS.currency_symbol;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCustomers(data as Customer[]);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      vat_number: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      vat_number: customer.vat_number || "",
      is_active: customer.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleOpenSettle = (customer: Customer) => {
    setSettleCustomer(customer);
    setSettleAmount(customer.total_credit_due.toString());
    setIsSettleOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Customer name is required");
      return;
    }

    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        toast.error("Phone number must be exactly 10 digits");
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        vat_number: formData.vat_number || null,
        is_active: formData.is_active,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", editingCustomer.id);
        if (error) throw error;
        toast.success("Customer updated successfully");
      } else {
        const { error } = await supabase.from("customers").insert([payload]);
        if (error) throw error;
        toast.success("Customer added successfully");
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomer) return;
    
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (amount > settleCustomer.total_credit_due) {
      toast.error("Amount cannot be greater than the total credit due");
      return;
    }

    setIsSettling(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Insert ledger entry (type: 'payment')
      const { error } = await supabase.from("customer_ledgers").insert([{
        customer_id: settleCustomer.id,
        type: 'payment',
        amount: amount,
        notes: 'Manual balance settlement',
        created_by: userData.user.id
      }]);

      if (error) throw error;
      toast.success("Payment recorded successfully");
      setIsSettleOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <ProtectedRoute resource="customers" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Customers (Naya Potha)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your parties and track credit ledgers
            </p>
          </div>
          {canCreate && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Customer Name</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium text-right">Credit Due (Udhar)</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading customers...</p>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-foreground font-medium">No customers found</p>
                      <p className="text-muted-foreground mt-1">Try adjusting your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className="bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-medium text-foreground text-base block">
                              {customer.name}
                            </span>
                            {customer.vat_number && (
                              <span className="text-xs text-muted-foreground">VAT: {customer.vat_number}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          {customer.phone && (
                            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {customer.phone}</span>
                          )}
                          {!customer.phone && <span>-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "font-mono font-bold text-base",
                          customer.total_credit_due > 0 ? "text-destructive" : "text-success"
                        )}>
                          {currencySymbol} {customer.total_credit_due.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {customer.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {customer.total_credit_due > 0 && (
                            <button 
                              onClick={() => handleOpenSettle(customer)}
                              className="px-3 py-1.5 bg-success/10 hover:bg-success/20 text-success rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5"
                            >
                              <Banknote className="w-3.5 h-3.5" /> Settle
                            </button>
                          )}
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
                                    onClick={() => handleOpenEdit(customer)}
                                    className="flex items-center gap-2 px-2 py-2 text-sm text-foreground hover:bg-muted rounded-lg cursor-pointer outline-none"
                                  >
                                    <Edit className="w-4 h-4 text-muted-foreground" />
                                    Edit
                                  </DropdownMenu.Item>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dialog Modal - Add/Edit Customer */}
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 p-6">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground">
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. Nimal Perera"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. 0771234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">VAT Number</label>
                    <input
                      type="text"
                      value={formData.vat_number}
                      onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[60px] resize-none"
                    placeholder="Customer address..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 pb-4 border-b border-border">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
                    Customer account is active
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
                    {editingCustomer ? "Update Customer" : "Add Customer"}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Dialog Modal - Settle Balance */}
        <Dialog.Root open={isSettleOpen} onOpenChange={setIsSettleOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-sm bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 p-6">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-xl font-heading font-bold text-foreground">
                  Settle Balance
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSettleSubmit} className="space-y-4">
                {settleCustomer && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl mb-4">
                    <p className="text-sm text-destructive font-medium">Total Amount Due:</p>
                    <p className="text-2xl font-mono font-bold text-destructive">
                      {currencySymbol} {settleCustomer.total_credit_due.toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Payment Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
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
                    disabled={isSettling}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success hover:bg-success/90 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
                  >
                    {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirm Payment
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
