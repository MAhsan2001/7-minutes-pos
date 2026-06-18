-- ============================================
-- 7 Minutes POS — Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tally ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: Get current user role
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES
-- ============================================

-- All authenticated users can view profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================
-- PERMISSIONS
-- ============================================

CREATE POLICY "permissions_select" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "permissions_admin" ON public.permissions
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================
-- CATEGORIES
-- ============================================

-- All authenticated users can read categories
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (true);

-- Admin can manage categories
CREATE POLICY "categories_admin" ON public.categories
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================
-- PRODUCTS
-- ============================================

-- All authenticated users can read products
CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (true);

-- Admin can manage products
CREATE POLICY "products_admin_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "products_admin_update" ON public.products
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "products_admin_delete" ON public.products
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================
-- SALES
-- ============================================

-- Admin and accountant can read all sales
CREATE POLICY "sales_select_admin" ON public.sales
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'accountant'));

-- Cashier can read their own sales
CREATE POLICY "sales_select_cashier" ON public.sales
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'cashier' AND cashier_id = auth.uid()
  );

-- Admin and cashier can create sales
CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'cashier'));

-- Admin can update/void sales
CREATE POLICY "sales_update_admin" ON public.sales
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================
-- SALE ITEMS
-- ============================================

CREATE POLICY "sale_items_select" ON public.sale_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sale_items_insert" ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'cashier'));

-- ============================================
-- STOCK MOVEMENTS
-- ============================================

CREATE POLICY "stock_movements_select" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'stock_manager', 'accountant'));

CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'stock_manager', 'cashier'));

-- ============================================
-- SUPPLIERS
-- ============================================

CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'stock_manager', 'accountant'));

CREATE POLICY "suppliers_manage" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'stock_manager'));

-- ============================================
-- PURCHASES
-- ============================================

CREATE POLICY "purchases_select" ON public.purchases
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'stock_manager', 'accountant'));

CREATE POLICY "purchases_manage" ON public.purchases
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'stock_manager'));

-- ============================================
-- PURCHASE ITEMS
-- ============================================

CREATE POLICY "purchase_items_select" ON public.purchase_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "purchase_items_manage" ON public.purchase_items
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'stock_manager'));

-- ============================================
-- DAILY TALLY
-- ============================================

CREATE POLICY "daily_tally_select" ON public.daily_tally
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'accountant'));

CREATE POLICY "daily_tally_manage" ON public.daily_tally
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'accountant'));

-- ============================================
-- PRICE HISTORY
-- ============================================

CREATE POLICY "price_history_select" ON public.price_history
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'accountant'));

-- Insert is handled by the trigger (SECURITY DEFINER)

-- ============================================
-- AUDIT LOGS
-- ============================================

-- Only admin can view audit logs
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

-- All authenticated users can insert audit logs
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No one can update or delete audit logs (append-only)

-- ============================================
-- SETTINGS
-- ============================================

CREATE POLICY "settings_select" ON public.settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "settings_manage" ON public.settings
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');
