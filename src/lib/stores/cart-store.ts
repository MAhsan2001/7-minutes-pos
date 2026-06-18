import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

interface CartStore {
  items: CartItem[];
  discountAmount: number;
  discountType: "fixed" | "percentage";
  
  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  incrementQuantity: (cartItemId: string) => void;
  decrementQuantity: (cartItemId: string) => void;
  setDiscount: (amount: number, type: "fixed" | "percentage") => void;
  clearCart: () => void;
  
  // Computed
  getSubtotal: () => number;
  getDiscountValue: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discountAmount: 0,
      discountType: "fixed",

      addItem: (item) => {
        set((state) => {
          const cart_item_id = item.cart_item_id || (item.product_id + (item.variant_id ? '-' + item.variant_id : '') + (item.addons?.map(a => a.id).sort().join('-') || ''));
          
          const existingItem = state.items.find((i) => i.cart_item_id === cart_item_id);
          
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.cart_item_id === cart_item_id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, cart_item_id, quantity: 1 }],
          };
        });
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cart_item_id !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.cart_item_id === cartItemId ? { ...i, quantity } : i
          ),
        }));
      },

      incrementQuantity: (cartItemId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.cart_item_id === cartItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }));
      },

      decrementQuantity: (cartItemId) => {
        const item = get().items.find((i) => i.cart_item_id === cartItemId);
        if (item && item.quantity <= 1) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.cart_item_id === cartItemId
              ? { ...i, quantity: i.quantity - 1 }
              : i
          ),
        }));
      },

      setDiscount: (amount, type) => {
        set({ discountAmount: amount, discountType: type });
      },

      clearCart: () => {
        set({ items: [], discountAmount: 0, discountType: "fixed" });
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0
        );
      },

      getDiscountValue: () => {
        const { discountAmount, discountType } = get();
        const subtotal = get().getSubtotal();
        if (discountType === "percentage") {
          return (subtotal * discountAmount) / 100;
        }
        return Math.min(discountAmount, subtotal);
      },

      getTotal: () => {
        return get().getSubtotal() - get().getDiscountValue();
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "mount-bakers-cart",
      // Only persist items and discount to localStorage for crash recovery
      partialize: (state) => ({
        items: state.items,
        discountAmount: state.discountAmount,
        discountType: state.discountType,
      }),
    }
  )
);
