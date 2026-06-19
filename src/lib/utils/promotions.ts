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
  const cartTrackers = cartItems.map(item => ({
    item,
    remainingQty: item.quantity
  }));

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
      // Find matching items for each combo requirement
      const reqMatches = promo.combo_items.map(reqItem => {
        // Find ALL cart trackers that satisfy this requirement
        const matchingTrackers = cartTrackers.filter((tracker) => {
          if (tracker.remainingQty <= 0) return false;
          if (tracker.item.product_id !== reqItem.product_id) return false;
          if (reqItem.variant_id && tracker.item.variant_id !== reqItem.variant_id) return false;
          if (reqItem.required_addons && reqItem.required_addons.length > 0) {
            const cartAddonIds = tracker.item.addons?.map(a => a.id) || [];
            const hasAllAddons = reqItem.required_addons.every(a => cartAddonIds.includes(a));
            if (!hasAllAddons) return false;
          }
          return true;
        });

        const totalAvailableQty = matchingTrackers.reduce((sum, t) => sum + t.remainingQty, 0);
        return { reqItem, matchingTrackers, totalAvailableQty };
      });

      let maxCombos = Infinity;
      for (const match of reqMatches) {
        const possible = Math.floor(match.totalAvailableQty / match.reqItem.quantity);
        if (possible < maxCombos) maxCombos = possible;
      }

      if (maxCombos > 0) {
        let regularPriceForCombos = 0;
        // Deduct exactly `reqItem.quantity * maxCombos` from the matching trackers
        for (const match of reqMatches) {
          let neededToDeduct = match.reqItem.quantity * maxCombos;
          for (const tracker of match.matchingTrackers) {
            if (neededToDeduct <= 0) break;
            const deduct = Math.min(tracker.remainingQty, neededToDeduct);
            
            // Add the exact unit price of THIS specific cart item (including variant and addons)
            regularPriceForCombos += (deduct * tracker.item.unit_price);
            
            tracker.remainingQty -= deduct;
            neededToDeduct -= deduct;
            
            if (!affectedItems.includes(tracker.item.product_name)) {
              affectedItems.push(tracker.item.product_name);
            }
          }
        }

        const comboPrice = promo.value * maxCombos;
        if (regularPriceForCombos > comboPrice) {
          promoDiscount += (regularPriceForCombos - comboPrice);
        }
      }
    } else {
      // Standard targets
      for (const tracker of cartTrackers) {
        if (tracker.remainingQty <= 0) continue;
        const item = tracker.item;
        
        const product = products.find(p => p.id === item.product_id);
        if (!product) continue;

        const matchesTarget =
          promo.target_type === "all" ||
          (promo.target_type === "product" && promo.target_id === item.product_id) ||
          (promo.target_type === "category" && promo.target_id === product.category_id);

        if (matchesTarget && tracker.remainingQty >= promo.min_quantity) {
          if (!affectedItems.includes(item.product_name)) {
            affectedItems.push(item.product_name);
          }
          
          if (promo.type === "bogo") {
            const freeItemsValue = promo.value; 
            const paidItemsRequired = promo.min_quantity; 
            const bundleSize = paidItemsRequired + freeItemsValue;
            const bundles = Math.floor(tracker.remainingQty / bundleSize);
            
            if (bundles > 0) {
              const freeQty = bundles * freeItemsValue;
              promoDiscount += freeQty * item.unit_price;
              tracker.remainingQty -= (bundles * bundleSize);
            }
          } 
          else if (promo.type === "bundle_fixed_price") {
            const bundles = Math.floor(tracker.remainingQty / promo.min_quantity);
            if (bundles > 0) {
              const itemsInBundles = bundles * promo.min_quantity;
              const regularPriceForBundles = itemsInBundles * item.unit_price;
              const bundlePrice = bundles * promo.value;
              
              if (regularPriceForBundles > bundlePrice) {
                promoDiscount += (regularPriceForBundles - bundlePrice);
                tracker.remainingQty -= itemsInBundles;
              }
            }
          }
          else if (promo.type === "discount_percentage") {
            const discountPerItem = item.unit_price * (promo.value / 100);
            promoDiscount += discountPerItem * tracker.remainingQty;
            tracker.remainingQty = 0; 
          } 
          else if (promo.type === "discount_fixed") {
            const discountPerItem = Math.min(item.unit_price, promo.value);
            promoDiscount += discountPerItem * tracker.remainingQty;
            tracker.remainingQty = 0; 
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
