-- ============================================
-- 7 Minutes POS — Bundle Promotion Upgrade
-- ============================================

-- Add new promotion type for "Buy X for Rs. Y" (Bundle Pricing)
ALTER TYPE promotion_type ADD VALUE IF NOT EXISTS 'bundle_fixed_price';
