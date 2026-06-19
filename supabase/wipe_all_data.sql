-- =========================================================================
-- WIPE EVERYTHING (Complete Factory Reset)
-- This script safely deletes all transactions, products, categories, 
-- customers, suppliers, and resets all settings to their defaults.
-- =========================================================================

-- 1. Delete all transactions
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM stock_movements;
DELETE FROM customer_ledgers;
DELETE FROM daily_tally;
DELETE FROM price_history;
DELETE FROM audit_logs;

-- 2. Delete all Master Data
DELETE FROM product_addons;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM promotions;
DELETE FROM suppliers;
DELETE FROM customers;

-- 3. Reset Settings to Default
UPDATE settings 
SET value = '{"email": "", "phone": "", "address": "", "bakery_name": "7 Minutes", "shift_cashiers": []}'::jsonb 
WHERE key = 'bakery_profile';

UPDATE settings 
SET value = '{"logo": null, "width": "80mm", "footer": "Thank you! Come again!", "header": "Welcome!", "auto_print": false, "show_logo": false, "font_size": "text-sm", "font_family": "''Arial'', sans-serif"}'::jsonb 
WHERE key = 'receipt_settings';

-- Done! You now have a completely blank slate.
