-- ============================================
-- 7 Minutes POS — Combo Deals Upgrade
-- ============================================

-- Add new target type for "combo" deals
ALTER TYPE promotion_target_type ADD VALUE IF NOT EXISTS 'combo';

-- Add a JSONB column to store the exact recipe/items for the combo
-- Format will be: [{"product_id": "uuid-here", "quantity": 1}, {"product_id": "uuid2-here", "quantity": 2}]
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS combo_items JSONB DEFAULT NULL;
