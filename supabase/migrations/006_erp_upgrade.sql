-- ============================================
-- 7 Minutes POS — ERP Upgrade (Migration 006)
-- Adds Customers, Ledgers, Variants, and Taxes
-- ============================================

-- ============================================
-- 1. CUSTOMERS (Parties)
-- ============================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  vat_number TEXT,
  total_credit_due DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_credit_due >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.customers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 2. CUSTOMER LEDGERS (Naya Potha)
-- ============================================

DO $$ BEGIN
  CREATE TYPE ledger_entry_type AS ENUM ('credit_sale', 'payment', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.customer_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL, -- Null if it's a payment
  type ledger_entry_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_ledgers_customer ON public.customer_ledgers(customer_id);

-- Trigger to auto-update total_credit_due in customers table
CREATE OR REPLACE FUNCTION public.update_customer_credit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IN ('credit_sale', 'adjustment') THEN
    UPDATE public.customers
    SET total_credit_due = total_credit_due + NEW.amount
    WHERE id = NEW.customer_id;
  ELSIF NEW.type = 'payment' THEN
    UPDATE public.customers
    SET total_credit_due = GREATEST(total_credit_due - NEW.amount, 0)
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ledger_entry ON public.customer_ledgers;
CREATE TRIGGER on_ledger_entry
  AFTER INSERT ON public.customer_ledgers
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_credit();

-- ============================================
-- 3. PRODUCT VARIANTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Small', 'Large', 'Red'
  sku_suffix TEXT, -- e.g., '-SM', '-LG'
  price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Add to base price
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);

-- ============================================
-- 4. UPDATE SALES & SALE ITEMS
-- ============================================

DO $$ BEGIN
  ALTER TABLE public.sales
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sscl_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sscl_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- ============================================
-- 5. UPDATE COMPLETE SALE RPC
-- ============================================

DROP FUNCTION IF EXISTS public.complete_sale(text, numeric, numeric, numeric, numeric, payment_method, text, jsonb);

CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number TEXT,
  p_total_amount DECIMAL,
  p_discount_amount DECIMAL,
  p_paid_amount DECIMAL,
  p_change_amount DECIMAL,
  p_payment_method payment_method,
  p_notes TEXT,
  p_items JSONB, -- Array of {product_id, variant_id, product_name, quantity, unit_price, total_price, vat_amount, sscl_amount}
  p_customer_id UUID DEFAULT NULL,
  p_vat_amount DECIMAL DEFAULT 0,
  p_sscl_amount DECIMAL DEFAULT 0,
  p_is_credit BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_cashier_id UUID;
  v_credit_amount DECIMAL;
BEGIN
  v_cashier_id := auth.uid();
  
  IF v_cashier_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to complete a sale';
  END IF;

  -- Create the sale record
  INSERT INTO public.sales (
    invoice_number, cashier_id, total_amount, discount_amount,
    paid_amount, change_amount, payment_method, notes,
    customer_id, vat_amount, sscl_amount, is_credit
  )
  VALUES (
    p_invoice_number, v_cashier_id, p_total_amount, p_discount_amount,
    p_paid_amount, p_change_amount, p_payment_method, p_notes,
    p_customer_id, p_vat_amount, p_sscl_amount, p_is_credit
  )
  RETURNING id INTO v_sale_id;

  -- Insert sale items and create stock movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert sale item
    INSERT INTO public.sale_items (
      sale_id, product_id, variant_id, product_name, quantity, unit_price, total_price, vat_amount, sscl_amount
    )
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      NULLIF(v_item->>'variant_id', '')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total_price')::DECIMAL,
      COALESCE((v_item->>'vat_amount')::DECIMAL, 0),
      COALESCE((v_item->>'sscl_amount')::DECIMAL, 0)
    );

    -- Create stock movement (the trigger will update product/variant stock)
    INSERT INTO public.stock_movements (
      product_id, type, quantity, reference_id, notes, created_by
    )
    VALUES (
      (v_item->>'product_id')::UUID,
      'sale',
      (v_item->>'quantity')::INTEGER,
      v_sale_id,
      'Sale: ' || p_invoice_number,
      v_cashier_id
    );

    -- Deduct variant stock if applicable
    IF NULLIF(v_item->>'variant_id', '') IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock_quantity = GREATEST(stock_quantity - (v_item->>'quantity')::INTEGER, 0)
      WHERE id = (v_item->>'variant_id')::UUID;
    END IF;

  END LOOP;

  -- If it's a credit sale (paid < total), create ledger entry
  IF p_is_credit AND p_customer_id IS NOT NULL THEN
    v_credit_amount := p_total_amount - p_paid_amount;
    
    IF v_credit_amount > 0 THEN
      INSERT INTO public.customer_ledgers (
        customer_id, sale_id, type, amount, notes, created_by
      ) VALUES (
        p_customer_id, v_sale_id, 'credit_sale', v_credit_amount, 'Unpaid balance for Invoice ' || p_invoice_number, v_cashier_id
      );
    END IF;
  END IF;

  -- Log to audit
  INSERT INTO public.audit_logs (user_id, action, resource, resource_id, new_values)
  VALUES (
    v_cashier_id,
    'create',
    'sales',
    v_sale_id,
    jsonb_build_object(
      'invoice_number', p_invoice_number,
      'total_amount', p_total_amount,
      'payment_method', p_payment_method,
      'is_credit', p_is_credit,
      'customer_id', p_customer_id
    )
  );

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. PERMISSIONS
-- ============================================

INSERT INTO public.permissions (role, resource, action, is_allowed) VALUES
  ('admin', 'customers', 'create', true),
  ('admin', 'customers', 'read', true),
  ('admin', 'customers', 'update', true),
  ('admin', 'customers', 'delete', true),
  ('cashier', 'customers', 'read', true),
  ('cashier', 'customers', 'create', true),
  ('accountant', 'customers', 'read', true),
  ('admin', 'accounting', 'read', true),
  ('accountant', 'accounting', 'read', true)
ON CONFLICT (role, resource, action) DO NOTHING;
