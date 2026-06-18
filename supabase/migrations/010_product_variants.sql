-- ============================================
-- 7 Minutes POS — Product Variants & Addons
-- ============================================

-- 006_erp_upgrade created a version of this table. Let's alter it if it exists to match the new schema.
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost DECIMAL(12,2),
  sku TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure the old columns are dropped and new columns exist
DO $$ BEGIN
  ALTER TABLE public.product_variants DROP COLUMN IF EXISTS sku_suffix;
  ALTER TABLE public.product_variants DROP COLUMN IF EXISTS price_adjustment;
  ALTER TABLE public.product_variants DROP COLUMN IF EXISTS stock_quantity;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS cost DECIMAL(12,2);
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS sku TEXT;
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.product_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Extra Cheese'
  price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;

-- Also update sale_items to support tracking which variant and addons were purchased
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_name TEXT,
ADD COLUMN IF NOT EXISTS addons JSONB;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow authenticated read variants" ON public.product_variants;
  DROP POLICY IF EXISTS "Allow authenticated read addons" ON public.product_addons;
  DROP POLICY IF EXISTS "Allow admin all variants" ON public.product_variants;
  DROP POLICY IF EXISTS "Allow admin all addons" ON public.product_addons;
EXCEPTION WHEN undefined_object THEN null; END $$;

CREATE POLICY "Allow authenticated read variants" ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read addons" ON public.product_addons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin all variants" ON public.product_variants FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ============================================
-- Update complete_sale RPC to handle variants
-- ============================================

CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number TEXT,
  p_total_amount DECIMAL,
  p_discount_amount DECIMAL,
  p_paid_amount DECIMAL,
  p_change_amount DECIMAL,
  p_payment_method payment_method,
  p_notes TEXT,
  p_items JSONB, -- Array of {product_id, variant_id, variant_name, product_name, quantity, unit_price, total_price, addons}
  p_customer_id UUID DEFAULT NULL,
  p_vat_amount DECIMAL DEFAULT 0,
  p_sscl_amount DECIMAL DEFAULT 0,
  p_is_credit BOOLEAN DEFAULT FALSE,
  p_shift_cashier_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_cashier_id UUID;
BEGIN
  v_cashier_id := auth.uid();
  
  IF v_cashier_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to complete a sale';
  END IF;

  -- Create the sale record
  INSERT INTO public.sales (
    invoice_number, cashier_id, total_amount, discount_amount,
    paid_amount, change_amount, payment_method, notes,
    customer_id, vat_amount, sscl_amount, is_credit, shift_cashier_name
  )
  VALUES (
    p_invoice_number, v_cashier_id, p_total_amount, p_discount_amount,
    p_paid_amount, p_change_amount, p_payment_method, p_notes,
    p_customer_id, p_vat_amount, p_sscl_amount, p_is_credit, p_shift_cashier_name
  )
  RETURNING id INTO v_sale_id;

  -- Insert sale items and create stock movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert sale item
    INSERT INTO public.sale_items (
      sale_id, product_id, variant_id, variant_name, product_name, quantity, unit_price, total_price, addons
    )
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      v_item->>'variant_name',
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total_price')::DECIMAL,
      (v_item->'addons')::JSONB
    );

    -- Create stock movement
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
  END LOOP;

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
      'items_count', jsonb_array_length(p_items)
    )
  );

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE POLICY "Allow admin all addons" ON public.product_addons FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
