-- ==============================================================================
-- 7 MINUTES POS - SAMPLE TEST DATA
-- ==============================================================================
-- Run this script to automatically populate your POS with sample categories
-- and products so you can easily test the system and combo deals!
-- ==============================================================================

-- 1. Create Categories
INSERT INTO public.categories (id, name, icon, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Submarines', '🥪', true),
  ('22222222-2222-2222-2222-222222222222', 'Sides & Snacks', '🍟', true),
  ('33333333-3333-3333-3333-333333333333', 'Beverages', '🥤', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Products
INSERT INTO public.products (id, name, category_id, price, cost_price, barcode, sku, low_stock_threshold, is_active)
VALUES 
  -- Submarines
  ('aaaa1111-1111-1111-1111-111111111111', 'Chicken Submarine', '11111111-1111-1111-1111-111111111111', 550.00, 300.00, 'SUB001', 'SUB-CHK', 10, true),
  ('aaaa2222-2222-2222-2222-222222222222', 'Chicken 65 Submarine', '11111111-1111-1111-1111-111111111111', 600.00, 350.00, 'SUB002', 'SUB-C65', 10, true),
  
  -- Sides
  ('bbbb1111-1111-1111-1111-111111111111', 'Medium French Fries', '22222222-2222-2222-2222-222222222222', 500.00, 200.00, 'SDE001', 'FRY-MED', 20, true),
  ('bbbb2222-2222-2222-2222-222222222222', 'Chicken Nuggets (6 pcs)', '22222222-2222-2222-2222-222222222222', 750.00, 400.00, 'SDE002', 'NUG-CHK', 20, true),
  
  -- Beverages
  ('cccc1111-1111-1111-1111-111111111111', 'Chocolate Milkshake', '33333333-3333-3333-3333-333333333333', 650.00, 300.00, 'BEV001', 'SHK-CHO', 15, true),
  ('cccc2222-2222-2222-2222-222222222222', 'Coca Cola 500ml', '33333333-3333-3333-3333-333333333333', 250.00, 150.00, 'BEV002', 'SODA-COK', 50, true)
ON CONFLICT (id) DO NOTHING;

-- 2.5 Create Variants & Addons
INSERT INTO public.product_variants (product_id, name, price)
VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', 'Small - Classic', 250.00),
  ('aaaa1111-1111-1111-1111-111111111111', 'Medium - Classic', 550.00),
  ('aaaa1111-1111-1111-1111-111111111111', 'Medium - Spicy', 650.00),
  ('aaaa1111-1111-1111-1111-111111111111', 'Large - Classic', 850.00),
  ('aaaa1111-1111-1111-1111-111111111111', 'Large - Spicy', 1050.00),
  
  ('aaaa2222-2222-2222-2222-222222222222', 'Small - Classic', 300.00),
  ('aaaa2222-2222-2222-2222-222222222222', 'Medium - Classic', 600.00),
  ('aaaa2222-2222-2222-2222-222222222222', 'Medium - Spicy', 700.00),
  ('aaaa2222-2222-2222-2222-222222222222', 'Large - Classic', 950.00),
  ('aaaa2222-2222-2222-2222-222222222222', 'Large - Spicy', 1150.00);

INSERT INTO public.product_addons (product_id, name, price)
VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', 'Extra Cheese', 120.00),
  ('aaaa2222-2222-2222-2222-222222222222', 'Extra Cheese', 120.00);

-- 3. Add initial stock for these products so you can sell them
INSERT INTO public.stock_movements (product_id, type, quantity, notes, created_by)
SELECT id, 'purchase', 100, 'Initial test stock', (SELECT id FROM public.profiles LIMIT 1)
FROM public.products
WHERE id IN (
  'aaaa1111-1111-1111-1111-111111111111',
  'aaaa2222-2222-2222-2222-222222222222',
  'bbbb1111-1111-1111-1111-111111111111',
  'bbbb2222-2222-2222-2222-222222222222',
  'cccc1111-1111-1111-1111-111111111111',
  'cccc2222-2222-2222-2222-222222222222'
);
