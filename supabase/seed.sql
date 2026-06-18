-- ============================================
-- 7 Minutes POS — Seed Data
-- ============================================

-- Insert Categories
INSERT INTO public.categories (name, description, icon, sort_order) VALUES
  ('Buns', 'Freshly baked buns with various fillings', '🥐', 1),
  ('Breads', 'Bread loaves and rolls', '🍞', 2),
  ('Cakes', 'Celebration and slice cakes', '🎂', 3),
  ('Pastries', 'Puff pastries and savory bites', '🥧', 4),
  ('Cookies & Biscuits', 'Cookies, biscuits, and crackers', '🍪', 5),
  ('Short Eats', 'Savory short eats and snacks', '🥟', 6),
  ('Beverages', 'Hot and cold drinks', '☕', 7),
  ('Other', 'Miscellaneous bakery items', '🧁', 8);

-- Insert Products (Sri Lankan Bakery Items)
-- Buns
INSERT INTO public.products (name, sku, category_id, price, cost_price, unit, stock_quantity, low_stock_threshold) VALUES
  ('Fish Bun', 'BUN-0001', (SELECT id FROM public.categories WHERE name = 'Buns'), 70.00, 35.00, 'piece', 100, 20),
  ('Chicken Bun', 'BUN-0002', (SELECT id FROM public.categories WHERE name = 'Buns'), 100.00, 50.00, 'piece', 80, 20),
  ('Seeni Sambol Bun', 'BUN-0003', (SELECT id FROM public.categories WHERE name = 'Buns'), 70.00, 30.00, 'piece', 90, 20),
  ('Jam Bun', 'BUN-0004', (SELECT id FROM public.categories WHERE name = 'Buns'), 80.00, 35.00, 'piece', 120, 25),
  ('Dot Bun', 'BUN-0005', (SELECT id FROM public.categories WHERE name = 'Buns'), 70.00, 30.00, 'piece', 100, 20),
  ('Cream Bun', 'BUN-0006', (SELECT id FROM public.categories WHERE name = 'Buns'), 90.00, 40.00, 'piece', 60, 15),
  ('Sausage Bun', 'BUN-0007', (SELECT id FROM public.categories WHERE name = 'Buns'), 120.00, 60.00, 'piece', 50, 15),
  ('Egg Bun', 'BUN-0008', (SELECT id FROM public.categories WHERE name = 'Buns'), 100.00, 50.00, 'piece', 70, 15),
  ('Vegetable Bun', 'BUN-0009', (SELECT id FROM public.categories WHERE name = 'Buns'), 80.00, 35.00, 'piece', 60, 15),
  ('Butter Bun', 'BUN-0010', (SELECT id FROM public.categories WHERE name = 'Buns'), 60.00, 25.00, 'piece', 100, 25);

-- Breads
INSERT INTO public.products (name, sku, category_id, price, cost_price, unit, stock_quantity, low_stock_threshold) VALUES
  ('White Bread (Large)', 'BRD-0001', (SELECT id FROM public.categories WHERE name = 'Breads'), 250.00, 120.00, 'loaf', 40, 10),
  ('White Bread (Small)', 'BRD-0002', (SELECT id FROM public.categories WHERE name = 'Breads'), 150.00, 70.00, 'loaf', 50, 15),
  ('Brown Bread', 'BRD-0003', (SELECT id FROM public.categories WHERE name = 'Breads'), 300.00, 150.00, 'loaf', 30, 10),
  ('Milk Bread', 'BRD-0004', (SELECT id FROM public.categories WHERE name = 'Breads'), 280.00, 130.00, 'loaf', 25, 10),
  ('Roast Paan', 'BRD-0005', (SELECT id FROM public.categories WHERE name = 'Breads'), 50.00, 20.00, 'piece', 150, 30);

-- Cakes
INSERT INTO public.products (name, sku, category_id, price, cost_price, unit, stock_quantity, low_stock_threshold) VALUES
  ('Chocolate Cake (Slice)', 'CKE-0001', (SELECT id FROM public.categories WHERE name = 'Cakes'), 200.00, 90.00, 'piece', 30, 10),
  ('Vanilla Cake (Slice)', 'CKE-0002', (SELECT id FROM public.categories WHERE name = 'Cakes'), 180.00, 80.00, 'piece', 30, 10),
  ('Butter Cake (Slice)', 'CKE-0003', (SELECT id FROM public.categories WHERE name = 'Cakes'), 150.00, 65.00, 'piece', 40, 10),
  ('Rich Cake (Slice)', 'CKE-0004', (SELECT id FROM public.categories WHERE name = 'Cakes'), 250.00, 120.00, 'piece', 20, 8),
  ('Ribbon Cake (Slice)', 'CKE-0005', (SELECT id FROM public.categories WHERE name = 'Cakes'), 200.00, 90.00, 'piece', 25, 8);

-- Pastries & Short Eats
INSERT INTO public.products (name, sku, category_id, price, cost_price, unit, stock_quantity, low_stock_threshold) VALUES
  ('Egg Patty', 'PST-0001', (SELECT id FROM public.categories WHERE name = 'Pastries'), 100.00, 45.00, 'piece', 60, 15),
  ('Fish Patty', 'PST-0002', (SELECT id FROM public.categories WHERE name = 'Pastries'), 100.00, 45.00, 'piece', 60, 15),
  ('Chicken Patty', 'PST-0003', (SELECT id FROM public.categories WHERE name = 'Pastries'), 120.00, 55.00, 'piece', 50, 15),
  ('Vegetable Patty', 'PST-0004', (SELECT id FROM public.categories WHERE name = 'Pastries'), 90.00, 40.00, 'piece', 50, 15),
  ('Fish Roll', 'PST-0005', (SELECT id FROM public.categories WHERE name = 'Pastries'), 80.00, 35.00, 'piece', 80, 20),
  ('Chinese Roll', 'PST-0006', (SELECT id FROM public.categories WHERE name = 'Pastries'), 80.00, 35.00, 'piece', 70, 20),
  ('Cutlet', 'PST-0007', (SELECT id FROM public.categories WHERE name = 'Pastries'), 70.00, 30.00, 'piece', 80, 20);

-- Cookies & Biscuits
INSERT INTO public.products (name, sku, category_id, price, cost_price, unit, stock_quantity, low_stock_threshold) VALUES
  ('Butter Cookies (Pack)', 'COK-0001', (SELECT id FROM public.categories WHERE name = 'Cookies & Biscuits'), 350.00, 160.00, 'pack', 30, 10),
  ('Chocolate Chip Cookies (Pack)', 'COK-0002', (SELECT id FROM public.categories WHERE name = 'Cookies & Biscuits'), 400.00, 180.00, 'pack', 25, 10),
  ('Coconut Cookies (Pack)', 'COK-0003', (SELECT id FROM public.categories WHERE name = 'Cookies & Biscuits'), 300.00, 130.00, 'pack', 30, 10);

-- Beverages
INSERT INTO public.products (name, sku, category_id, price, cost_price, unit, stock_quantity, low_stock_threshold) VALUES
  ('Plain Tea', 'BEV-0001', (SELECT id FROM public.categories WHERE name = 'Beverages'), 50.00, 15.00, 'piece', 999, 50),
  ('Milk Tea', 'BEV-0002', (SELECT id FROM public.categories WHERE name = 'Beverages'), 80.00, 25.00, 'piece', 999, 50),
  ('Coffee', 'BEV-0003', (SELECT id FROM public.categories WHERE name = 'Beverages'), 100.00, 30.00, 'piece', 999, 50);

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('bakery_profile', '{"bakery_name": "7 Minutes", "address": "Colombo, Sri Lanka", "phone": "+94-XX-XXXXXXX", "logo_url": null}'),
  ('receipt_settings', '{"header": "Welcome to 7 Minutes!", "footer": "Thank you! Visit again!", "auto_print": false, "width": "80mm"}'),
  ('system_settings', '{"currency_symbol": "Rs.", "tax_rate": 0, "theme": "system", "language": "en"}');

-- Insert default permissions
INSERT INTO public.permissions (role, resource, action, is_allowed) VALUES
  -- Admin: full access
  ('admin', 'dashboard', 'read', true),
  ('admin', 'pos', 'create', true),
  ('admin', 'pos', 'read', true),
  ('admin', 'products', 'create', true),
  ('admin', 'products', 'read', true),
  ('admin', 'products', 'update', true),
  ('admin', 'products', 'delete', true),
  ('admin', 'stock', 'create', true),
  ('admin', 'stock', 'read', true),
  ('admin', 'stock', 'update', true),
  ('admin', 'sales', 'create', true),
  ('admin', 'sales', 'read', true),
  ('admin', 'sales', 'update', true),
  ('admin', 'sales', 'delete', true),
  ('admin', 'daily_tally', 'create', true),
  ('admin', 'daily_tally', 'read', true),
  ('admin', 'daily_tally', 'update', true),
  ('admin', 'reports', 'read', true),
  ('admin', 'price_history', 'read', true),
  ('admin', 'audit_logs', 'read', true),
  ('admin', 'settings', 'read', true),
  ('admin', 'settings', 'update', true),
  ('admin', 'suppliers', 'create', true),
  ('admin', 'suppliers', 'read', true),
  ('admin', 'suppliers', 'update', true),
  ('admin', 'suppliers', 'delete', true),
  
  -- Cashier
  ('cashier', 'dashboard', 'read', true),
  ('cashier', 'pos', 'create', true),
  ('cashier', 'pos', 'read', true),
  ('cashier', 'products', 'read', true),
  ('cashier', 'sales', 'create', true),
  ('cashier', 'sales', 'read', true),
  ('cashier', 'reports', 'read', true),
  
  -- Stock Manager
  ('stock_manager', 'dashboard', 'read', true),
  ('stock_manager', 'products', 'read', true),
  ('stock_manager', 'stock', 'create', true),
  ('stock_manager', 'stock', 'read', true),
  ('stock_manager', 'stock', 'update', true),
  ('stock_manager', 'suppliers', 'create', true),
  ('stock_manager', 'suppliers', 'read', true),
  ('stock_manager', 'suppliers', 'update', true),
  ('stock_manager', 'reports', 'read', true),
  
  -- Accountant
  ('accountant', 'dashboard', 'read', true),
  ('accountant', 'products', 'read', true),
  ('accountant', 'stock', 'read', true),
  ('accountant', 'sales', 'read', true),
  ('accountant', 'daily_tally', 'create', true),
  ('accountant', 'daily_tally', 'read', true),
  ('accountant', 'daily_tally', 'update', true),
  ('accountant', 'reports', 'read', true),
  ('accountant', 'price_history', 'read', true),
  ('accountant', 'suppliers', 'read', true);
