-- ==============================================================================
-- 7 MINUTES POS - FACTORY RESET SCRIPT
-- ==============================================================================
-- WARNING: Running this script will PERMANENTLY DELETE all transactional data, 
-- inventory, customers, and logs. It will NOT delete settings, permissions, 
-- or user accounts (cashiers/admins).
-- 
-- Instructions: Run this ONCE when you are ready to hand over the system.
-- ==============================================================================

-- 1. Wipe all sales data
TRUNCATE TABLE public.sale_items CASCADE;
TRUNCATE TABLE public.sales CASCADE;

-- 2. Wipe all stock & inventory data
TRUNCATE TABLE public.stock_movements CASCADE;
TRUNCATE TABLE public.price_history CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.categories CASCADE;

-- 3. Wipe all people (except users/profiles)
TRUNCATE TABLE public.suppliers CASCADE;
TRUNCATE TABLE public.customers CASCADE;

-- 4. Wipe promotions
TRUNCATE TABLE public.promotions CASCADE;

-- 5. Wipe logs and tallies
TRUNCATE TABLE public.daily_tally CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;

-- ==============================================================================
-- DONE. The system is now wiped clean and ready for production!
-- Note: Remember to manually delete any test cashiers in the Supabase Auth Dashboard.
-- ==============================================================================
