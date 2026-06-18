"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/stores/cart-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import { db } from "@/lib/db/dexie";
import { formatCurrency, cn, generateInvoiceNumber } from "@/lib/utils";
import { CASH_DENOMINATIONS, PAYMENT_METHODS, APP_NAME } from "@/lib/utils/constants";
import type { Product, Category, Customer, Promotion, PaymentMethod } from "@/lib/types";
import { calculateInclusiveTaxes } from "@/lib/utils/tax";
import { calculatePromotions } from "@/lib/utils/promotions";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  Loader2,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Printer,
  UserCircle,
  ChevronDown,
  FileText
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Receipt } from "@/components/pos/Receipt";
import { A4Invoice } from "@/components/pos/A4Invoice";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [appliedPromotions, setAppliedPromotions] = useState<{promotionName: string, discountAmount: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("walk-in");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<string | null>(null);
  const [shiftCashiers, setShiftCashiers] = useState<string[]>([]);
  const [isCashierDropdownOpen, setIsCashierDropdownOpen] = useState(false);

  // Variant Modal State
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());

  // Dynamic Bakery Settings for Receipt
  const [bakeryProfile, setBakeryProfile] = useState<{ name: string; address: string; phone: string; email?: string } | null>(null);
  const [receiptSettings, setReceiptSettings] = useState<{ header: string; footer: string; width: "58mm" | "80mm"; logo?: string; showLogo?: boolean; fontFamily?: string; fontSize?: string } | null>(null);

  // Success Modal State
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
  const [receiptSnapshot, setReceiptSnapshot] = useState<any>(null);
  const [printMode, setPrintMode] = useState<"thermal" | "a4">("thermal");

  const cart = useCartStore();
  const { isOnline, pendingSyncCount, setPendingSyncCount } = useUIStore();
  const { profile } = useAuthStore();
  const supabase = createClient();
  
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const savedCashier = localStorage.getItem("pos_shift_cashier");
    if (savedCashier) {
      setSelectedCashier(savedCashier);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCashierDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCashierChange = (name: string) => {
    setSelectedCashier(name);
    if (name) {
      localStorage.setItem("pos_shift_cashier", name);
    } else {
      localStorage.removeItem("pos_shift_cashier");
    }
  };

  async function fetchData() {
    setIsLoading(true);
    try {
      const [productsRes, categoriesRes, customersRes, promosRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, variants:product_variants(*), addons:product_addons(*)")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("customers")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("promotions")
          .select("*")
          .eq("is_active", true)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (promosRes.error) throw promosRes.error;

      setProducts(productsRes.data as Product[]);
      setCategories(categoriesRes.data as Category[]);
      setCustomers(customersRes.data as Customer[]);
      setPromotions(promosRes.data as Promotion[]);
      
      // Fetch Settings
      const { data: settingsData } = await supabase.from("settings").select("*");
      if (settingsData) {
        const profileSetting = settingsData.find(s => s.key === "bakery_profile")?.value;
        const receiptSetting = settingsData.find(s => s.key === "receipt_settings")?.value;
        
        if (profileSetting) {
          const profile = profileSetting as any;
          if (profile.shift_cashiers) setShiftCashiers(profile.shift_cashiers);
          setBakeryProfile({
            name: profile.bakery_name || APP_NAME.toUpperCase(),
            address: profile.address || "Mount Lavinia, Sri Lanka",
            phone: profile.phone || "011-XXXXXXX",
            email: profile.email || ""
          });
        }
        if (receiptSetting) {
          const receipt = receiptSetting as any;
          setReceiptSettings({
            header: receipt.header || "",
            footer: receipt.footer || "Thank you! Come again!",
            width: receipt.receipt_width || "80mm",
            logo: receipt.logo,
            showLogo: receipt.show_logo !== undefined ? receipt.show_logo : true,
            fontFamily: receipt.font_family || "'Arial', sans-serif",
            fontSize: receipt.font_size || "text-sm"
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching POS data:", error);
      toast.error(`Failed to load products: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-calculate promotions when cart items change
  useEffect(() => {
    if (products.length > 0 && promotions.length > 0) {
      const { totalDiscount, appliedPromotions: applied } = calculatePromotions(cart.items, promotions, products);
      cart.setDiscount(totalDiscount, "fixed");
      setAppliedPromotions(applied);
    } else {
      cart.setDiscount(0, "fixed");
      setAppliedPromotions([]);
    }
  }, [cart.items, promotions, products]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product) => {
    // If product has active variants or addons, open the modal
    const hasActiveVariants = product.variants && product.variants.filter(v => v.is_active).length > 0;
    const hasActiveAddons = product.addons && product.addons.filter(a => a.is_active).length > 0;

    if (hasActiveVariants || hasActiveAddons) {
      setSelectedProductForVariants(product);
      setSelectedVariantId("");
      setSelectedAddons(new Set());
      return;
    }

    const currentCartItem = cart.items.find((i) => i.product_id === product.id);
    const currentQty = currentCartItem ? currentCartItem.quantity : 0;
    
    // Default click adds 1 unit/kg
    if (currentQty + 1 > product.min_stock_level) {
      // NOTE: product.min_stock_level is actually the field we have in Product type right now, 
      // but in reality we want to check stock. Let's just ignore stock check for variants right now if it's missing.
    }

    cart.addItem({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      image_url: product.image_url,
      unit: undefined,
    });
  };

  const handleAddVariantToCart = () => {
    if (!selectedProductForVariants) return;
    
    const activeVariants = selectedProductForVariants.variants?.filter(v => v.is_active) || [];
    
    if (activeVariants.length > 0 && !selectedVariantId) {
      toast.error("Please select a variant.");
      return;
    }

    let finalPrice = selectedProductForVariants.price;
    let variantName = undefined;
    let variantId = undefined;

    if (selectedVariantId) {
      const variant = activeVariants.find(v => v.id === selectedVariantId);
      if (variant) {
        finalPrice = variant.price;
        variantName = variant.name;
        variantId = variant.id;
      }
    }

    const selectedAddonsData = [];
    const activeAddons = selectedProductForVariants.addons?.filter(a => a.is_active) || [];
    for (const addonId of selectedAddons) {
      const addon = activeAddons.find(a => a.id === addonId);
      if (addon) {
        selectedAddonsData.push({ id: addon.id, name: addon.name, price: addon.price });
        finalPrice += addon.price;
      }
    }

    cart.addItem({
      product_id: selectedProductForVariants.id,
      product_name: selectedProductForVariants.name,
      variant_id: variantId,
      variant_name: variantName,
      unit_price: finalPrice,
      image_url: selectedProductForVariants.image_url,
      addons: selectedAddonsData.length > 0 ? selectedAddonsData : undefined,
    });

    setSelectedProductForVariants(null);
  };

  const handleQuickCash = (amount: number) => {
    const current = parseFloat(paidAmount || "0");
    setPaidAmount((current + amount).toString());
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) return;

    const totalDue = cart.getTotal();
    const paid = parseFloat(paidAmount || "0");
    
    // Credit Sale check
    const isCreditSale = paid < totalDue;
    if (isCreditSale && selectedCustomerId === "walk-in") {
      toast.error("You must select a registered Customer for Credit/Udhar sales");
      return;
    }

    setIsProcessing(true);
    try {
      // Calculate overall taxes
      const { ssclAmount, vatAmount } = calculateInclusiveTaxes(cart.getSubtotal() - cart.getDiscountValue());
      // Generate a custom invoice number
      const invoiceNumber = generateInvoiceNumber();
      const changeAmount = paymentMethod === "cash" ? paid - totalDue : 0;
      const finalPaidAmount = paymentMethod === "cash" ? paid : totalDue;

      const payload = {
        p_invoice_number: invoiceNumber,
        p_total_amount: cart.getSubtotal(),
        p_discount_amount: cart.getDiscountValue(),
        p_paid_amount: finalPaidAmount,
        p_change_amount: changeAmount,
        p_payment_method: paymentMethod,
        p_notes: notes ? `${notes} | Promos: ${appliedPromotions.map(p => p.promotionName).join(", ")}` : (appliedPromotions.length > 0 ? `Promos: ${appliedPromotions.map(p => p.promotionName).join(", ")}` : null),
        p_customer_id: selectedCustomerId === "walk-in" ? null : selectedCustomerId,
        p_vat_amount: vatAmount,
        p_sscl_amount: ssclAmount,
        p_is_credit: isCreditSale,
        p_items: cart.items.map((i) => {
          const itemTotal = i.quantity * i.unit_price;
          const { ssclAmount: itemSscl, vatAmount: itemVat } = calculateInclusiveTaxes(itemTotal);
          return {
            product_id: i.product_id,
            variant_id: i.variant_id || null,
            variant_name: i.variant_name || null,
            product_name: i.product_name,
            addons: i.addons || null,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total_price: itemTotal,
            sscl_amount: itemSscl,
            vat_amount: itemVat,
          };
        }),
        p_shift_cashier_name: profile?.role === "admin" ? null : (selectedCashier || null),
      };

      if (isOnline) {
        // Online: Sync immediately to Supabase
        const { error } = await supabase.rpc("complete_sale", payload);
        if (error) throw error;
      } else {
        // Offline: Save to Dexie IndexedDB
        await db.pendingSales.add({
          payload,
          created_at: new Date().toISOString()
        });
        setPendingSyncCount(pendingSyncCount + 1);
        toast.success("Saved offline. Will sync when reconnected.");
      }

      // Capture receipt data before clearing cart
      setReceiptSnapshot({
        invoiceNumber,
        items: [...cart.items],
        totalAmount: cart.getSubtotal(), // Gross Subtotal
        discountAmount: cart.getDiscountValue(),
        paidAmount: finalPaidAmount,
        changeAmount,
        paymentMethod,
        date: new Date(),
        shiftCashierName: profile?.role === "admin" ? null : (selectedCashier || null),
        customer: customers.find((c) => c.id === selectedCustomerId) || null,
      });

      setLastInvoiceNumber(invoiceNumber);
      cart.clearCart();
      setIsCheckoutOpen(false);
      setIsMobileCartOpen(false);
      setPaidAmount("");
      setNotes("");
      setSelectedCustomerId("walk-in");
      setIsSuccessOpen(true);
      fetchData(); // Refresh stock levels implicitly
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to complete sale");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ProtectedRoute resource="sales" action="create">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-0 lg:gap-6 overflow-hidden relative print:hidden">
        {/* Left Side: Product Grid (65%) */}
        <div className="flex-1 flex flex-col min-w-0 bg-card lg:rounded-2xl border-x-0 lg:border lg:border-border lg:shadow-sm overflow-hidden h-full pb-20 lg:pb-0">
          {/* Header & Filters */}
          <div className="p-4 border-b border-border space-y-4 shrink-0 bg-muted/10">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products or SKU (Press '/' to focus)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Category Pills */}
            <ScrollArea.Root className="w-full">
              <ScrollArea.Viewport className="w-full rounded-lg">
                <div className="flex items-center gap-2 pb-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                      selectedCategory === "all"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background border border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    All Items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                        selectedCategory === cat.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background border border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span>{cat.icon}</span>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal" className="flex touch-none select-none bg-muted/50 p-0.5 rounded-full">
                <ScrollArea.Thumb className="flex-1 bg-border rounded-full relative" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                <Package className="w-16 h-16 text-muted-foreground/30" />
                <div>
                  <p className="text-lg font-semibold text-foreground">No products found</p>
                  <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="flex flex-col bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95"
                  >
                    <div className="h-28 bg-muted w-full flex items-center justify-center relative">
                      {/* Placeholder for image, using first letter of product as fallback icon */}
                      <span className="text-4xl font-heading font-bold text-muted-foreground/30 group-hover:text-primary/20 transition-colors">
                        {product.name.charAt(0)}
                      </span>
                      {typeof product.stock_quantity === 'number' && typeof product.low_stock_threshold === 'number' && product.stock_quantity <= product.low_stock_threshold && (
                        <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {product.stock_quantity} left
                        </div>
                      )}
                    </div>
                    <div className="p-3 w-full text-left border-t border-border/50">
                      <h3 className="font-semibold text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-primary font-bold">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          /{product.unit}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile View Cart Button (Sticky Bottom) */}
        {!isMobileCartOpen && cart.items.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:hidden z-30 animate-in slide-in-from-bottom-full duration-300">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg flex justify-between items-center px-6"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 bg-foreground text-background text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {cart.getItemCount()}
                  </span>
                </div>
                <span className="text-lg">View Cart</span>
              </div>
              <span className="text-xl">{formatCurrency(cart.getTotal())}</span>
            </button>
          </div>
        )}

        {/* Mobile Overlay */}
        {isMobileCartOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
            onClick={() => setIsMobileCartOpen(false)}
          />
        )}

        {/* Right Side: Cart Panel (35%) */}
        <div className={cn(
          "fixed inset-y-0 right-0 z-50 w-[90%] sm:w-[400px] bg-card flex flex-col shadow-2xl transform transition-transform duration-300 border-l border-border",
          isMobileCartOpen ? "translate-x-0" : "translate-x-full",
          "lg:static lg:translate-x-0 lg:w-[400px] lg:rounded-2xl lg:border lg:shadow-sm lg:flex lg:flex-col lg:shrink-0"
        )}>
          {/* Cart Header */}
          <div className="flex flex-col p-4 border-b border-border bg-muted/10 shrink-0 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMobileCartOpen(false)}
                  className="lg:hidden p-1.5 mr-1 bg-muted hover:bg-muted-foreground/10 rounded-lg text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <ShoppingCart className="w-5 h-5 text-primary hidden lg:block" />
                <h2 className="text-lg font-heading font-bold text-foreground">Current Order</h2>
              </div>
              <button
                onClick={() => cart.clearCart()}
                disabled={cart.items.length === 0}
                className="text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            </div>
            
            {shiftCashiers.length > 0 && profile?.role !== "admin" && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsCashierDropdownOpen(!isCashierDropdownOpen)}
                  className={cn(
                    "flex items-center justify-between w-full p-3 rounded-xl border transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary/20",
                    selectedCashier 
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30" 
                      : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10 animate-pulse"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      selectedCashier ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                    )}>
                      <UserCircle className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Shift Cashier
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        selectedCashier ? "text-foreground" : "text-destructive"
                      )}>
                        {selectedCashier || "Select your name..."}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 opacity-50 transition-transform duration-300",
                    isCashierDropdownOpen && "rotate-180"
                  )} />
                </button>

                {isCashierDropdownOpen && (
                  <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-background/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95">
                    <div className="p-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                      {shiftCashiers.map(cashier => (
                        <button
                          key={cashier}
                          onClick={() => {
                            handleCashierChange(cashier);
                            setIsCashierDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all text-left group",
                            selectedCashier === cashier
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <UserCircle className={cn(
                            "w-4 h-4 transition-transform group-hover:scale-110",
                            selectedCashier === cashier ? "text-primary-foreground/80" : "text-muted-foreground"
                          )} />
                          {cashier}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <ShoppingCart className="w-12 h-12 text-muted-foreground/20" />
                <p className="text-muted-foreground font-medium">Your cart is empty</p>
                <p className="text-sm text-muted-foreground/70">Click on products to add them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex gap-3 bg-background p-3 rounded-xl border border-border/50 shadow-sm animate-in fade-in slide-in-from-right-4">
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground truncate">{item.product_name}</h4>
                        {item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>}
                        {item.addons && item.addons.map(a => (
                          <p key={a.id} className="text-xs text-muted-foreground/80">+ {a.name}</p>
                        ))}
                        <p className="text-sm text-primary font-medium">{formatCurrency(item.unit_price)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {item.unit === 'kg' ? (
                          <input
                            type="number"
                            min="0"
                            step="0.05"
                            value={item.quantity}
                            onChange={(e) => {
                              let val = parseFloat(e.target.value) || 0;
                              if (item.max_stock !== undefined && val > item.max_stock) {
                                toast.error(`Cannot exceed available stock (${item.max_stock}).`);
                                val = item.max_stock;
                              }
                              cart.updateQuantity(item.cart_item_id!, val);
                            }}
                            className="w-16 px-1.5 py-1 text-center font-semibold text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary no-spinners"
                          />
                        ) : (
                          <>
                            <button
                              onClick={() => cart.decrementQuantity(item.cart_item_id!)}
                              className="p-1 bg-muted hover:bg-muted-foreground/20 rounded-md transition-colors"
                            >
                              <Minus className="w-4 h-4 text-foreground" />
                            </button>
                            <span className="sr-only">Quantity</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity || ""}
                              onChange={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val)) return; // Prevent deletion on empty
                                if (item.max_stock !== undefined && val > item.max_stock) {
                                  toast.error(`Cannot exceed available stock (${item.max_stock}).`);
                                  val = item.max_stock;
                                }
                                cart.updateQuantity(item.cart_item_id!, val);
                              }}
                              className="w-12 px-1 py-1 text-center font-semibold text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary no-spinners"
                            />
                            <button
                              onClick={() => {
                                if (item.max_stock !== undefined && item.quantity + 1 > item.max_stock) {
                                  toast.error(`Cannot exceed available stock (${item.max_stock}).`);
                                } else {
                                  cart.incrementQuantity(item.cart_item_id!);
                                }
                              }}
                              className="p-1 bg-muted hover:bg-muted-foreground/20 rounded-md transition-colors"
                            >
                              <Plus className="w-4 h-4 text-foreground" />
                            </button>
                          </>
                        )}
                        {item.unit && <span className="text-xs font-bold text-muted-foreground uppercase">{item.unit}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => cart.removeItem(item.cart_item_id!)}
                        className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-foreground">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer / Totals */}
          <div className="p-4 border-t border-border bg-muted/10 shrink-0 space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.getSubtotal())}</span>
            </div>
            {appliedPromotions.length > 0 && (
              <div className="pt-2 space-y-1">
                {appliedPromotions.map((promo, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-primary font-medium">
                    <span>{promo.promotionName}</span>
                    <span>-{formatCurrency(promo.discountAmount)}</span>
                  </div>
                ))}
              </div>
            )}
            {cart.getDiscountValue() > 0 && appliedPromotions.length === 0 && (
              <div className="flex justify-between text-sm text-success font-medium">
                <span>Manual Discount</span>
                <span>-{formatCurrency(cart.getDiscountValue())}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-heading font-bold text-foreground pt-3 border-t border-border/50">
              <span>Total</span>
              <span>{formatCurrency(cart.getTotal())}</span>
            </div>

            {shiftCashiers.length > 0 && profile?.role !== "admin" && !selectedCashier && (
              <p className="text-xs text-destructive text-center font-bold bg-destructive/10 border border-destructive/20 py-2.5 rounded-lg animate-pulse">
                ⚠️ Select a Shift Cashier to unlock checkout
              </p>
            )}

            <button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.items.length === 0 || (shiftCashiers.length > 0 && profile?.role !== "admin" && !selectedCashier)}
              className="w-full py-4 mt-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/90 hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:shadow-md flex justify-center items-center gap-2"
            >
              Checkout <span className="opacity-80">({cart.getItemCount()} items)</span>
            </button>
          </div>
        </div>

        {/* Checkout Modal */}
        <Dialog.Root open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-heading font-bold text-foreground">
                  Complete Sale
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center mb-6">
                <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">Total Due</p>
                <p className="text-4xl font-heading font-bold text-foreground">
                  {formatCurrency(cart.getTotal())}
                </p>
              </div>

              <form onSubmit={handleCheckout} className="space-y-6">
                
                {/* Customer Selection */}
                <div className="space-y-2 animate-in slide-in-from-top-1">
                  <label className="text-sm font-medium text-foreground">Select Customer (Party)</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  >
                    <option value="walk-in">Walk-in Customer (Paid immediately)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `- ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Discount Feature */}
                <div className="flex items-end gap-3 animate-in slide-in-from-top-1">
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium text-foreground">Discount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cart.discountAmount === 0 ? "" : cart.discountAmount}
                      onChange={(e) => cart.setDiscount(parseFloat(e.target.value) || 0, cart.discountType)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2 w-28 shrink-0">
                    <select
                      value={cart.discountType}
                      onChange={(e) => cart.setDiscount(cart.discountAmount, e.target.value as "fixed" | "percentage")}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-center appearance-none cursor-pointer"
                    >
                      <option value="fixed">Rs.</option>
                      <option value="percentage">%</option>
                    </select>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map((method) => {
                    const icons = {
                      Banknote: <Banknote className="w-5 h-5" />,
                      CreditCard: <CreditCard className="w-5 h-5" />,
                      Smartphone: <Smartphone className="w-5 h-5" />,
                    };
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-medium",
                          paymentMethod === method.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {icons[method.icon as keyof typeof icons]}
                        {method.label}
                      </button>
                    );
                  })}
                </div>

                {/* Cash Specific Controls */}
                {paymentMethod === "cash" && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Amount Paid (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full px-4 py-3 text-lg font-bold bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid grid-cols-1">
                      <button
                        type="button"
                        onClick={() => setPaidAmount(cart.getTotal().toString())}
                        className="w-full py-3 bg-primary/10 text-primary hover:bg-primary/20 font-bold rounded-lg transition-colors"
                      >
                        Exact Amount
                      </button>
                    </div>

                    {/* Change Display */}
                    {(parseFloat(paidAmount || "0") - cart.getTotal()) > 0 && (
                      <div className="flex justify-between items-center p-4 bg-success/10 border border-success/20 rounded-xl">
                        <span className="font-medium text-success">Change Due</span>
                        <span className="text-xl font-bold text-success">
                          {formatCurrency(parseFloat(paidAmount || "0") - cart.getTotal())}
                        </span>
                      </div>
                    )}

                    {/* Credit Display */}
                    {selectedCustomerId !== "walk-in" && (cart.getTotal() - parseFloat(paidAmount || "0")) > 0 && (
                      <div className="flex justify-between items-center p-4 bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in">
                        <span className="font-medium text-destructive">Added to Ledger (Udhar)</span>
                        <span className="text-xl font-bold text-destructive">
                          {formatCurrency(cart.getTotal() - parseFloat(paidAmount || "0"))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || (shiftCashiers.length > 0 && profile?.role !== "admin" && !selectedCashier)}
                  className="w-full py-4 text-lg bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex justify-center items-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  Confirm Payment
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Variant Selection Modal */}
        <Dialog.Root open={!!selectedProductForVariants} onOpenChange={(open) => !open && setSelectedProductForVariants(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-heading font-bold text-foreground">
                  {selectedProductForVariants?.name}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="space-y-6">
                {selectedProductForVariants?.variants && selectedProductForVariants.variants.filter(v => v.is_active).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Select Size / Flavor *</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProductForVariants.variants.filter(v => v.is_active).map(variant => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={cn(
                            "flex justify-between items-center p-3 rounded-xl border-2 transition-all text-left",
                            selectedVariantId === variant.id 
                              ? "border-primary bg-primary/10 text-primary" 
                              : "border-border hover:border-primary/50 text-foreground"
                          )}
                        >
                          <span className="font-semibold">{variant.name}</span>
                          <span className="font-bold">{formatCurrency(variant.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProductForVariants?.addons && selectedProductForVariants.addons.filter(a => a.is_active).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Add-ons</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProductForVariants.addons.filter(a => a.is_active).map(addon => {
                        const isSelected = selectedAddons.has(addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => {
                              const next = new Set(selectedAddons);
                              if (isSelected) next.delete(addon.id);
                              else next.add(addon.id);
                              setSelectedAddons(next);
                            }}
                            className={cn(
                              "flex justify-between items-center p-3 rounded-xl border-2 transition-all text-left",
                              isSelected 
                                ? "border-success bg-success/10 text-success" 
                                : "border-border hover:border-success/50 text-foreground"
                            )}
                          >
                            <span className="font-semibold">+ {addon.name}</span>
                            <span className="font-bold">{formatCurrency(addon.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddVariantToCart}
                  className="w-full py-4 text-lg bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex justify-center items-center gap-2 mt-4"
                >
                  <Plus className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Success Modal */}
        <Dialog.Root open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in zoom-in-95 p-8 text-center">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <Dialog.Title className="text-2xl font-heading font-bold text-foreground mb-2">
                Sale Complete!
              </Dialog.Title>
              <p className="text-muted-foreground mb-6">
                Invoice {lastInvoiceNumber} has been successfully recorded.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setPrintMode("thermal");
                    setTimeout(() => window.print(), 50);
                  }}
                  className="w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Print Thermal Receipt
                </button>
                <button
                  onClick={() => {
                    setPrintMode("a4");
                    setTimeout(() => window.print(), 50);
                  }}
                  className="w-full py-3 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 border border-primary/20"
                >
                  <FileText className="w-5 h-5" />
                  Print A4 Invoice
                </button>
                <button
                  onClick={() => {
                    setIsSuccessOpen(false);
                    setReceiptSnapshot(null);
                  }}
                  className="w-full py-3 bg-muted text-foreground font-medium rounded-xl hover:bg-muted-foreground/10 transition-colors"
                >
                  New Sale
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>

      {/* Invisible Receipt/Invoice for Printing */}
      {receiptSnapshot && printMode === "thermal" && (
        <Receipt
          invoiceNumber={receiptSnapshot.invoiceNumber}
          items={receiptSnapshot.items}
          totalAmount={receiptSnapshot.totalAmount}
          discountAmount={receiptSnapshot.discountAmount}
          paidAmount={receiptSnapshot.paidAmount}
          changeAmount={receiptSnapshot.changeAmount}
          paymentMethod={receiptSnapshot.paymentMethod}
          date={receiptSnapshot.date}
          cashierName={receiptSnapshot.shiftCashierName || profile?.full_name}
          customerName={receiptSnapshot.customer?.name}
          bakeryName={bakeryProfile?.name}
          address={bakeryProfile?.address}
          phone={bakeryProfile?.phone}
          email={bakeryProfile?.email}
          headerMessage={receiptSettings?.header}
          footerMessage={receiptSettings?.footer}
          width={receiptSettings?.width}
          logo={receiptSettings?.logo}
          showLogo={receiptSettings?.showLogo}
          fontFamily={receiptSettings?.fontFamily}
          fontSize={receiptSettings?.fontSize}
        />
      )}

      <div className="hidden print:block">
        {receiptSnapshot && printMode === "a4" && (
          <A4Invoice
            invoiceNumber={receiptSnapshot.invoiceNumber}
            items={receiptSnapshot.items}
            totalAmount={receiptSnapshot.totalAmount}
            discountAmount={receiptSnapshot.discountAmount}
            paidAmount={receiptSnapshot.paidAmount}
            changeAmount={receiptSnapshot.changeAmount}
            paymentMethod={receiptSnapshot.paymentMethod}
            date={receiptSnapshot.date}
            cashierName={receiptSnapshot.shiftCashierName || profile?.full_name}
            customer={receiptSnapshot.customer}
            bakeryName={bakeryProfile?.name}
            address={bakeryProfile?.address}
            phone={bakeryProfile?.phone}
            email={bakeryProfile?.email}
            logo={receiptSettings?.logo}
            showLogo={receiptSettings?.showLogo}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
