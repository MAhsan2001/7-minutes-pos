-- ============================================
-- 7 Minutes POS — Essential Seed Data
-- (No sample products or categories)
-- ============================================

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
