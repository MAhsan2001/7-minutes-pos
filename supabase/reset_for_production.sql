-- ==============================================================================
-- 7 MINUTES POS - PRODUCTION RESET SCRIPT
-- ==============================================================================
-- WARNING: Running this script will PERMANENTLY DELETE all test data including:
-- Sales, Products, Categories, Stock Movements, Customers, and Promotions.
-- It will NOT delete your user accounts, logins, or app settings.
-- ==============================================================================

TRUNCATE TABLE public.sale_items CASCADE;
TRUNCATE TABLE public.sales CASCADE;
TRUNCATE TABLE public.stock_movements CASCADE;
TRUNCATE TABLE public.product_addons CASCADE;
TRUNCATE TABLE public.product_variants CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.customers CASCADE;
TRUNCATE TABLE public.promotions CASCADE;

-- Your database is now completely clean and ready for real production use!
