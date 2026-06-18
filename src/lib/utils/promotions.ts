import type { CartItem, Promotion, Product } from "@/lib/types";

export interface PromotionResult {
  totalDiscount: number;
  appliedPromotions: {
    promotionId: string;
    promotionName: string;
    discountAmount: number;
    affectedItems: string[];
  }[];
}

export function calculatePromotions(
  cartItems: CartItem[],
  promotions: Promotion[],
  products: Product[]
): PromotionResult {
  let totalDiscount = 0;
  const appliedPromotions: PromotionResult["appliedPromotions"] = [];

  if (!cartItems.length || !promotions.length) {
    return { totalDiscount, appliedPromotions };
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"

  // Filter valid promotions based on time and day
  const activePromotions = promotions.filter((promo) => {
    if (!promo.is_active) return false;

    if (promo.days_of_week && promo.days_of_week.length > 0) {
      if (!promo.days_of_week.includes(currentDay)) return false;
    }

    if (promo.start_time && promo.end_time) {
      const start = promo.start_time.substring(0, 5);
      const end = promo.end_time.substring(0, 5);
      if (start <= end) {
        if (currentTime < start || currentTime > end) return false;
      } else {
        // spans midnight (e.g., 22:00 to 02:00)
        if (currentTime < start && currentTime > end) return false;
      }
    }

    return true;
  });

  // Track remaining quantity of items that can be discounted to avoid double dipping
  const remainingItemQuantities = new Map<string, number>();
  cartItems.forEach(item => remainingItemQuantities.set(item.product_id, item.quantity));

  // Sort promotions by best value (BOGO first, then percentage, then fixed)
  const sortedPromos = [...activePromotions].sort((a, b) => {
    if (a.type === "bogo" && b.type !== "bogo") return -1;
    if (b.type === "bogo" && a.type !== "bogo") return 1;
    if (a.type === "discount_percentage" && b.type !== "discount_percentage") return -1;
    if (b.type === "discount_percentage" && a.type !== "discount_percentage") return 1;
    return b.value - a.value; 
  });

  for (const promo of sortedPromos) {
    let promoDiscount = 0;
    const affectedItems: string[] = [];

    if (promo.target_type === "combo" && promo.combo_items && promo.combo_items.length > 0) {
      // Evaluate combo deals
      // How many combos can we make?
      let maxCombos = Infinity;
      for (const reqItem of promo.combo_items) {
        const remainingQty = remainingItemQuantities.get(reqItem.product_id) || 0;
        const possibleCombos = Math.floor(remainingQty / reqItem.quantity);
        if (possibleCombos < maxCombos) {
          maxCombos = possibleCombos;
        }
      }

      if (maxCombos > 0) {
        let regularPriceForCombos = 0;
        for (const reqItem of promo.combo_items) {
          const product = products.find(p => p.id === reqItem.product_id);
          if (product) {
            affectedItems.push(product.name);
            regularPriceForCombos += product.price * reqItem.quantity * maxCombos;
            
            // Deduct the used quantities
            const currentQty = remainingItemQuantities.get(reqItem.product_id) || 0;
            remainingItemQuantities.set(reqItem.product_id, currentQty - (reqItem.quantity * maxCombos));
          }
        }

        const comboPrice = promo.value * maxCombos;
        if (regularPriceForCombos > comboPrice) {
          promoDiscount += (regularPriceForCombos - comboPrice);
        }
      }
    } else {
      // Standard targets
      for (const item of cartItems) {
        const remainingQty = remainingItemQuantities.get(item.product_id) || 0;
        if (remainingQty <= 0) continue;

        const product = products.find(p => p.id === item.product_id);
        if (!product) continue;

        const matchesTarget =
          promo.target_type === "all" ||
          (promo.target_type === "product" && promo.target_id === item.product_id) ||
          (promo.target_type === "category" && promo.target_id === product.category_id);

        if (matchesTarget && remainingQty >= promo.min_quantity) {
          affectedItems.push(item.product_name);
          
          if (promo.type === "bogo") {
            const freeItemsValue = promo.value; 
            const paidItemsRequired = promo.min_quantity; 
            const bundleSize = paidItemsRequired + freeItemsValue;
            const bundles = Math.floor(remainingQty / bundleSize);
            
            if (bundles > 0) {
              const freeQty = bundles * freeItemsValue;
              promoDiscount += freeQty * item.unit_price;
              remainingItemQuantities.set(item.product_id, remainingQty - (bundles * bundleSize));
            }
          } 
          else if (promo.type === "bundle_fixed_price") {
            const bundles = Math.floor(remainingQty / promo.min_quantity);
            if (bundles > 0) {
              const itemsInBundles = bundles * promo.min_quantity;
              const regularPriceForBundles = itemsInBundles * item.unit_price;
              const bundlePrice = bundles * promo.value;
              
              if (regularPriceForBundles > bundlePrice) {
                promoDiscount += (regularPriceForBundles - bundlePrice);
                remainingItemQuantities.set(item.product_id, remainingQty - itemsInBundles);
              }
            }
          }
          else if (promo.type === "discount_percentage") {
            const discountPerItem = item.unit_price * (promo.value / 100);
            promoDiscount += discountPerItem * remainingQty;
            remainingItemQuantities.set(item.product_id, 0); 
          } 
          else if (promo.type === "discount_fixed") {
            const discountPerItem = Math.min(item.unit_price, promo.value);
            promoDiscount += discountPerItem * remainingQty;
            remainingItemQuantities.set(item.product_id, 0); 
          }
        }
      }
    }

    if (promoDiscount > 0) {
      totalDiscount += promoDiscount;
      appliedPromotions.push({
        promotionId: promo.id,
        promotionName: promo.name,
        discountAmount: promoDiscount,
        affectedItems,
      });
    }
  }

  return { totalDiscount, appliedPromotions };
}
