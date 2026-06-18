-- ============================================
-- 7 Minutes POS — Advanced Promotions (Migration 007)
-- ============================================

DO $$ BEGIN
  CREATE TYPE promotion_type AS ENUM ('discount_percentage', 'discount_fixed', 'bogo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE promotion_target_type AS ENUM ('all', 'category', 'product');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type promotion_type NOT NULL,
  target_type promotion_target_type NOT NULL DEFAULT 'all',
  target_id UUID, -- NULL if applies to all. Otherwise references products(id) or categories(id)
  value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
  min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- 0=Sun, 1=Mon, ..., 6=Sat
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PERMISSIONS
-- ============================================

INSERT INTO public.permissions (role, resource, action, is_allowed) VALUES
  ('admin', 'promotions', 'create', true),
  ('admin', 'promotions', 'read', true),
  ('admin', 'promotions', 'update', true),
  ('admin', 'promotions', 'delete', true),
  ('cashier', 'promotions', 'read', true),
  ('stock_manager', 'promotions', 'read', true),
  ('accountant', 'promotions', 'read', true)
ON CONFLICT (role, resource, action) DO NOTHING;
